"""Tests mit echten, von ffmpeg erzeugten MP3-Dateien; ffprobe dient als unabhaengige Gegenprobe."""
import os
import subprocess
import tempfile
import time
import unittest
from pathlib import Path

import sort_inbox as s


def make_mp3(path, meta=None, v2=3, v1=False, tags=True):
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "sine=d=0.3"]
    for k, v in (meta or {}).items():
        cmd += ["-metadata", f"{k}={v}"]
    if tags:
        cmd += ["-id3v2_version", str(v2), "-write_id3v1", "1" if v1 else "0"]
    else:
        cmd += ["-write_id3v2", "0", "-write_id3v1", "0", "-map_metadata", "-1"]
    cmd += ["-y", str(path)]
    subprocess.run(cmd, check=True)
    old = time.time() - 3600
    os.utime(path, (old, old))


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format_tags", "-of", "default=nw=1", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return dict(l[4:].split("=", 1) for l in out.splitlines() if l.startswith("TAG:"))


class T(unittest.TestCase):
    def setUp(self):
        self._t = tempfile.TemporaryDirectory()
        self.d = Path(self._t.name)
        self.inbox, self.lib = self.d / "inbox", self.d / "lib"
        self.inbox.mkdir()
        self.lib.mkdir()

    def tearDown(self):
        self._t.cleanup()

    def run_sort(self, **kw):
        return s.sort_inbox(self.inbox, self.lib, log=lambda *_: None, **kw)

    def tree(self):
        return sorted(str(p.relative_to(self.lib)).replace(os.sep, "/") for p in self.lib.rglob("*.mp3"))

    # --- Parser gegen ffprobe
    def test_parser_matches_ffprobe_for_all_versions(self):
        meta = {"title": "Träum süß – 日本", "artist": "Björk", "album": "Álbum", "track": "3/12", "album_artist": "Björk",
                "disc": "2/2"}
        for v2 in (3, 4):
            p = self.d / f"v{v2}.mp3"
            make_mp3(p, meta, v2=v2, v1=True)
            tags, ref = s.read_tags(p), probe(p)
            self.assertEqual(tags["title"], ref["title"])
            self.assertEqual(tags["artist"], ref["artist"])
            self.assertEqual(tags["album"], ref["album"])
            self.assertEqual(s.parse_number(tags["track"]), 3)
            self.assertEqual(s.parse_number(tags["disc"]), 2)

    def test_id3v1_only(self):
        p = self.d / "v1.mp3"
        make_mp3(p, {"title": "Old Song", "artist": "Old Band", "album": "Old Album"}, v1=True)
        data = p.read_bytes()
        # ID3v2 entfernen, v1 behalten
        size = s._synchsafe(data[6:10]) + 10
        p.write_bytes(data[size:])
        tags = s.read_tags(p)
        self.assertEqual((tags["title"], tags["artist"], tags["album"]), ("Old Song", "Old Band", "Old Album"))

    # --- Einsortieren
    def test_flat_folder_with_mixed_albums_is_split(self):
        make_mp3(self.inbox / "a.mp3", {"title": "One", "artist": "Band A", "album": "First", "track": "1"})
        make_mp3(self.inbox / "b.mp3", {"title": "Two", "artist": "Band A", "album": "First", "track": "2"})
        make_mp3(self.inbox / "c.mp3", {"title": "Other", "artist": "Band B", "album": "Second", "track": "1"})
        self.assertEqual(self.run_sort(), (3, 0, 0))
        self.assertEqual(self.tree(), ["Band A/First/01 - One.mp3", "Band A/First/02 - Two.mp3",
                                       "Band B/Second/01 - Other.mp3"])

    def test_no_album_becomes_single_folder(self):
        make_mp3(self.inbox / "x.mp3", {"title": "Solo", "artist": "Lone"})
        self.run_sort()
        self.assertEqual(self.tree(), ["Lone/Solo - Single/Solo.mp3"])

    def test_filename_fallback_without_tags(self):
        make_mp3(self.inbox / "Daft Punk - One More Time.mp3", tags=False)
        make_mp3(self.inbox / "07 - Just A Title.mp3", tags=False)
        make_mp3(self.inbox / "50 Cent - In Da Club.mp3", tags=False)
        self.run_sort()
        self.assertEqual(self.tree(), ["50 Cent/In Da Club - Single/In Da Club.mp3",
                                       "Daft Punk/One More Time - Single/One More Time.mp3",
                                       f"{s.UNKNOWN_ARTIST}/Just A Title - Single/Just A Title.mp3"])

    def test_album_artist_wins_and_multi_artist_first(self):
        make_mp3(self.inbox / "a.mp3", {"title": "T", "artist": "Guest; Main", "album_artist": "Various Artists",
                                        "album": "Mix", "track": "5"})
        make_mp3(self.inbox / "b.mp3", {"title": "U", "artist": "First; Second", "album": "Own"})
        self.run_sort()
        self.assertEqual(self.tree(), ["First/Own/U.mp3", "Various Artists/Mix/05 - T.mp3"])

    def test_disc_prefix(self):
        make_mp3(self.inbox / "a.mp3", {"title": "T", "artist": "A", "album": "Al", "track": "4/9", "disc": "2/2"})
        self.run_sort()
        self.assertEqual(self.tree(), ["A/Al/2-04 - T.mp3"])

    def test_unsafe_names_stay_inside_library(self):
        make_mp3(self.inbox / "a.mp3", {"title": "../../evil", "artist": "AC/DC", "album": "..", "track": "1"})
        make_mp3(self.inbox / "b.mp3", {"title": "CON", "artist": "NUL", "album": "x:y?"})
        self.run_sort()
        files = self.tree()
        self.assertTrue(all(".." not in f.split("/") for f in files), files)
        self.assertIn("AC_DC/Unbekanntes Album/01 - _.._evil.mp3", files)
        self.assertEqual([p for p in self.d.rglob("*evil*") if not s.inside(p, self.lib)], [])
        self.assertTrue((self.lib / "_NUL").is_dir())

    def test_existing_folder_case_is_reused(self):
        (self.lib / "ACDC" / "Back In Black").mkdir(parents=True)
        make_mp3(self.inbox / "a.mp3", {"title": "T", "artist": "Acdc", "album": "back in black", "track": "1"})
        self.run_sort()
        self.assertEqual(self.tree(), ["ACDC/Back In Black/01 - T.mp3"])

    def test_collision_never_overwrites(self):
        for i in range(2):
            make_mp3(self.inbox / f"{i}.mp3", {"title": "Same", "artist": "A", "album": "B", "track": "1"}, v1=bool(i))
        self.run_sort()
        self.assertEqual(self.tree(), ["A/B/01 - Same (2).mp3", "A/B/01 - Same.mp3"])

    def test_identical_duplicate_goes_to_duplicates_folder(self):
        make_mp3(self.d / "orig.mp3", {"title": "Dup", "artist": "A", "album": "B", "track": "1"})
        for n in ("1.mp3", "2.mp3"):
            (self.inbox / n).write_bytes((self.d / "orig.mp3").read_bytes())
            os.utime(self.inbox / n, (time.time() - 3600,) * 2)
        self.assertEqual(self.run_sort(), (1, 1, 0))
        self.assertEqual(len(list((self.inbox / s.DUPLICATES_DIR).glob("*.mp3"))), 1)
        self.assertEqual(self.tree(), ["A/B/01 - Dup.mp3"])

    def test_recent_files_and_other_files_are_left_alone(self):
        make_mp3(self.inbox / "new.mp3", {"title": "N", "artist": "A", "album": "B"})
        os.utime(self.inbox / "new.mp3", None)
        (self.inbox / "cover.jpg").write_bytes(b"x")
        (self.inbox / "broken.mp3").write_bytes(b"not an mp3")
        os.utime(self.inbox / "broken.mp3", (time.time() - 3600,) * 2)
        moved, dups, skipped = self.run_sort()
        self.assertEqual((moved, skipped), (1, 1))  # broken.mp3 -> Dateiname-Fallback, new.mp3 uebersprungen
        self.assertTrue((self.inbox / "new.mp3").exists() and (self.inbox / "cover.jpg").exists())

    def test_subfolders_are_scanned_and_empty_ones_removed(self):
        sub = self.inbox / "Neu" / "Zeug"
        sub.mkdir(parents=True)
        make_mp3(sub / "a.mp3", {"title": "T", "artist": "A", "album": "B"})
        self.run_sort()
        self.assertEqual(self.tree(), ["A/B/T.mp3"])
        self.assertFalse((self.inbox / "Neu").exists())

    def test_dry_run_changes_nothing(self):
        make_mp3(self.inbox / "a.mp3", {"title": "T", "artist": "A", "album": "B"})
        self.assertEqual(self.run_sort(dry_run=True), (1, 0, 0))
        self.assertTrue((self.inbox / "a.mp3").exists())
        self.assertEqual(self.tree(), [])

    def test_overlapping_paths_rejected(self):
        with self.assertRaises(ValueError):
            s.sort_inbox(self.inbox, self.inbox / "lib")

    def test_filename_parser(self):
        self.assertEqual(s.parse_filename("01 - Title"), (None, "Title", 1))
        self.assertEqual(s.parse_filename("03. Artist - Song"), ("Artist", "Song", 3))
        self.assertEqual(s.parse_filename("10.000 Fragen"), (None, "10.000 Fragen", None))
        self.assertEqual(s.parse_filename("50 Cent - In Da Club"), ("50 Cent", "In Da Club", None))
        self.assertEqual(s.parse_filename("Just a title"), (None, "Just a title", None))


if __name__ == "__main__":
    unittest.main(verbosity=1)
