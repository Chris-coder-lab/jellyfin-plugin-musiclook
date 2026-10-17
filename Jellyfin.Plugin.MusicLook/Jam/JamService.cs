using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace Jellyfin.Plugin.MusicLook.Jam;

/// <summary>
/// One entry of a Jam queue. Only ids are stored, never titles, so nothing leaks past library permissions.
/// <c>Seq</c> is unique per entry within a Jam, so clients can tell "the same song again" from "still the same entry".
/// </summary>
public sealed record JamEntry(Guid ItemId, Guid AddedBy, long Seq);

/// <summary>Snapshot of a Jam handed to clients.</summary>
public sealed record JamState(string Code, Guid Host, long Version, int Index, IReadOnlyList<JamEntry> Queue, IReadOnlyList<Guid> Members);

/// <summary>Result of a Jam operation.</summary>
public sealed record JamResult(JamState? State, string? Error);

/// <summary>In-memory Jam sessions (shared queue, nacheinander abgespielt).</summary>
public sealed class JamService
{
    private const int MaxQueue = 200;
    private const int MaxSessions = 500;
    private const int MaxSessionsPerUser = 3;
    private const int MaxFailedJoins = 10;
    private const string Alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static readonly TimeSpan Ttl = TimeSpan.FromHours(6);
    private static readonly TimeSpan FailWindow = TimeSpan.FromMinutes(5);

    private readonly ConcurrentDictionary<string, Session> _sessions = new();
    private readonly ConcurrentDictionary<Guid, (int Count, DateTime Start)> _failedJoins = new();

    /// <summary>Checks the code format (6 chars from the allowed alphabet).</summary>
    public static bool IsValidCode(string? code)
    {
        if (code is null || code.Length != 6)
        {
            return false;
        }

        foreach (var c in code)
        {
            if (Alphabet.IndexOf(c) < 0)
            {
                return false;
            }
        }

        return true;
    }

    /// <summary>Creates a new Jam hosted by <paramref name="user"/>.</summary>
    public JamResult Create(Guid user, int maxMembers)
    {
        Cleanup();
        if (_sessions.Count >= MaxSessions)
        {
            return new JamResult(null, "limit");
        }

        if (_sessions.Values.Count(s => s.Host == user) >= MaxSessionsPerUser)
        {
            return new JamResult(null, "limit");
        }

        for (var attempt = 0; attempt < 20; attempt++)
        {
            var code = NewCode();
            var session = new Session(code, user, Math.Clamp(maxMembers, 2, 20));
            session.Members.Add(user);
            if (_sessions.TryAdd(code, session))
            {
                lock (session.Gate)
                {
                    return new JamResult(Snapshot(session), null);
                }
            }
        }

        return new JamResult(null, "limit");
    }

    /// <summary>Joins an existing Jam.</summary>
    public JamResult Join(string code, Guid user)
    {
        if (IsBlocked(user))
        {
            return new JamResult(null, "rate");
        }

        if (!_sessions.TryGetValue(code, out var session) || session.Expired)
        {
            RegisterFailure(user);
            return new JamResult(null, "not_found");
        }

        lock (session.Gate)
        {
            if (!session.Members.Contains(user))
            {
                if (session.Members.Count >= session.MaxMembers)
                {
                    return new JamResult(null, "full");
                }

                session.Members.Add(user);
                Touch(session);
            }

            return new JamResult(Snapshot(session), null);
        }
    }

    /// <summary>Leaves a Jam; an empty Jam is removed, the host role moves on.</summary>
    public JamResult Leave(string code, Guid user)
    {
        if (!_sessions.TryGetValue(code, out var session))
        {
            return new JamResult(null, "not_found");
        }

        lock (session.Gate)
        {
            if (!session.Members.Remove(user))
            {
                return new JamResult(null, "forbidden");
            }

            if (session.Members.Count == 0)
            {
                _sessions.TryRemove(code, out _);
                return new JamResult(null, null);
            }

            if (session.Host == user)
            {
                session.Host = session.Members.First();
            }

            Touch(session);
            return new JamResult(null, null);
        }
    }

    /// <summary>Returns the state; <c>null</c> state with no error means unchanged since <paramref name="since"/>.</summary>
    public JamResult Get(string code, Guid user, long since)
    {
        if (!_sessions.TryGetValue(code, out var session) || session.Expired)
        {
            return new JamResult(null, "not_found");
        }

        lock (session.Gate)
        {
            if (!session.Members.Contains(user))
            {
                return new JamResult(null, "forbidden");
            }

            session.LastActive = DateTime.UtcNow;
            return since == session.Version ? new JamResult(null, null) : new JamResult(Snapshot(session), null);
        }
    }

    /// <summary>Appends tracks to the queue.</summary>
    public JamResult Add(string code, Guid user, IReadOnlyList<Guid> items)
    {
        if (!_sessions.TryGetValue(code, out var session) || session.Expired)
        {
            return new JamResult(null, "not_found");
        }

        lock (session.Gate)
        {
            if (!session.Members.Contains(user))
            {
                return new JamResult(null, "forbidden");
            }

            if (items.Count == 0 || session.Queue.Count + items.Count > MaxQueue)
            {
                return new JamResult(null, "limit");
            }

            var oldCount = session.Queue.Count;
            foreach (var id in items)
            {
                session.Queue.Add(new JamEntry(id, user, ++session.NextSeq));
            }

            if (session.Index < 0 || session.Index >= oldCount)
            {
                session.Index = oldCount;
            }

            Touch(session);
            return new JamResult(Snapshot(session), null);
        }
    }

    /// <summary>Removes a queue entry (own entries, or any entry as host).</summary>
    public JamResult Remove(string code, Guid user, int index)
    {
        if (!_sessions.TryGetValue(code, out var session) || session.Expired)
        {
            return new JamResult(null, "not_found");
        }

        lock (session.Gate)
        {
            if (!session.Members.Contains(user))
            {
                return new JamResult(null, "forbidden");
            }

            if (index < 0 || index >= session.Queue.Count)
            {
                return new JamResult(null, "invalid");
            }

            if (session.Queue[index].AddedBy != user && session.Host != user)
            {
                return new JamResult(null, "forbidden");
            }

            session.Queue.RemoveAt(index);
            if (index < session.Index)
            {
                session.Index--;
            }

            Touch(session);
            return new JamResult(Snapshot(session), null);
        }
    }

    /// <summary>
    /// Compare-and-set advance: only moves when the current index still equals <paramref name="from"/>,
    /// so several clients reporting the end of the same track advance only once.
    /// </summary>
    public JamResult Advance(string code, Guid user, int from, int? to)
    {
        if (!_sessions.TryGetValue(code, out var session) || session.Expired)
        {
            return new JamResult(null, "not_found");
        }

        lock (session.Gate)
        {
            if (!session.Members.Contains(user))
            {
                return new JamResult(null, "forbidden");
            }

            if (session.Index == from)
            {
                var target = to ?? from + 1;
                session.Index = Math.Clamp(target, 0, session.Queue.Count);
                Touch(session);
            }

            return new JamResult(Snapshot(session), null);
        }
    }

    private static string NewCode()
    {
        Span<char> buf = stackalloc char[6];
        for (var i = 0; i < buf.Length; i++)
        {
            buf[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        }

        return new string(buf);
    }

    private static void Touch(Session s)
    {
        s.Version++;
        s.LastActive = DateTime.UtcNow;
    }

    private static JamState Snapshot(Session s) =>
        new(s.Code, s.Host, s.Version, s.Index, s.Queue.ToArray(), s.Members.ToArray());

    private void Cleanup()
    {
        foreach (var pair in _sessions)
        {
            if (pair.Value.Expired)
            {
                _sessions.TryRemove(pair.Key, out _);
            }
        }
    }

    private bool IsBlocked(Guid user)
    {
        if (!_failedJoins.TryGetValue(user, out var f))
        {
            return false;
        }

        if (DateTime.UtcNow - f.Start > FailWindow)
        {
            _failedJoins.TryRemove(user, out _);
            return false;
        }

        return f.Count >= MaxFailedJoins;
    }

    private void RegisterFailure(Guid user)
    {
        _failedJoins.AddOrUpdate(
            user,
            _ => (1, DateTime.UtcNow),
            (_, old) => DateTime.UtcNow - old.Start > FailWindow ? (1, DateTime.UtcNow) : (old.Count + 1, old.Start));
    }

    private sealed class Session
    {
        public Session(string code, Guid host, int maxMembers)
        {
            Code = code;
            Host = host;
            MaxMembers = maxMembers;
        }

        public string Code { get; }

        public Guid Host { get; set; }

        public int MaxMembers { get; }

        public HashSet<Guid> Members { get; } = new();

        public List<JamEntry> Queue { get; } = new();

        public int Index { get; set; } = -1;

        public long NextSeq;

        public long Version { get; set; } = 1;

        public DateTime LastActive { get; set; } = DateTime.UtcNow;

        public object Gate { get; } = new();

        public bool Expired => DateTime.UtcNow - LastActive > Ttl;
    }
}
