#!/usr/bin/env python3
"""Traegt MD5-Pruefsumme, URL und Zeitstempel einer gebauten ZIP in manifest.json ein.

Aufruf: python3 scripts/update_manifest.py <zip-datei> <github-user> <version>
"""
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

zip_path, user, version = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
md5 = hashlib.md5(zip_path.read_bytes()).hexdigest().upper()  # Jellyfin erwartet MD5
manifest_path = Path(__file__).resolve().parent.parent / "manifest.json"
# Der Workflow gibt die CHANGELOG.md des getaggten Standes mit (main kann den neuen Abschnitt noch nicht enthalten)
changelog_path = Path(os.environ["CHANGELOG_FILE"]) if os.environ.get("CHANGELOG_FILE") else manifest_path.parent / "CHANGELOG.md"


def changelog_for(ver):
    """Liest den Abschnitt '## <ver>' aus CHANGELOG.md; ohne Abschnitt bleibt ein neutraler Text."""
    try:
        text = changelog_path.read_text(encoding="utf-8")
    except OSError:
        return f"Music Look {ver}"
    lines, take = [], False
    for line in text.splitlines():
        if line.startswith("## "):
            if take:
                break
            take = line[3:].strip() == ver
            continue
        if take and line.strip():
            lines.append(line.strip())
    return "\n".join(lines) if lines else f"Music Look {ver}"

manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
plugin = manifest[0]
plugin["owner"] = user
plugin["description"] = ("Spotify-Look fuer Jellyfin 12: Musik-Bibliothek als Spotify-aehnliche App (Web, Android, Computer), "
                         "Spotify-Playlist-Import, Mixe, smarte Playlists, Songtexte, Equalizer, Offline-Downloads, Weiterhoeren auf allen Geraeten.")
plugin["overview"] = ("Music Look macht aus der Musik-Bibliothek deines Jellyfin-Servers eine Spotify-aehnliche Oberflaeche: "
                      "Startseite mit Playlists und Mixen, Spotify-Playlists importieren, Playlists teilen, Jam, Songtexte, Equalizer, "
                      "Offline-Downloads, Statistik und Weiterhoeren auf jedem Geraet. Nur fuer Jellyfin 12.x.")
plugin["category"] = "General"
entry = next((v for v in plugin["versions"] if v["version"] == version), None)
if entry is None:
    entry = dict(plugin["versions"][0]) if plugin["versions"] else {"targetAbi": "12.0.0.0", "checksum": "", "changelog": "", "sourceUrl": "", "timestamp": ""}
    entry["version"] = version
    plugin["versions"].insert(0, entry)
entry["checksum"] = md5
entry["changelog"] = changelog_for(version)
repo = os.environ.get("GITHUB_REPOSITORY") or f"{user}/jellyfin-plugin-musiclook"  # in GitHub Actions gesetzt
entry["sourceUrl"] = f"https://github.com/{repo}/releases/download/v{version}/{zip_path.name}"
entry["timestamp"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
# Platzhalter-Eintraege (noch ohne echte Pruefsumme) entfernen, damit Jellyfin nie einen kaputten Eintrag sieht
plugin["versions"] = [v for v in plugin["versions"] if v is entry or not str(v.get("checksum", "")).startswith("WIRD-VON")]
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"{zip_path.name}: MD5 {md5}")
