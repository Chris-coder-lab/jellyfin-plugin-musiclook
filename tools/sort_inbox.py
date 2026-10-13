#!/usr/bin/env python3
"""Sortiert MP3-Dateien aus einem Eingangsordner nach <Bibliothek>/<Künstler>/<Album>/.

Alle Lieder duerfen einfach in den Eingangsordner gelegt werden (auch gemischt, auch in Unterordnern).
Quelle der Daten: ID3-Tags (v2.2/2.3/2.4, Fallback v1), danach der Dateiname ("Künstler - Titel.mp3").
Dateien werden nie ueberschrieben und nie geloescht; Duplikate landen in <Eingang>/_Duplikate.

Referenzimplementierung der Logik des Plugins (Jellyfin.Plugin.MusicLook/Inbox).
"""
import argparse
import hashlib
import os
import re
import shutil
import struct
import sys
import time
from pathlib import Path

UNKNOWN_ARTIST = "Unbekannter Künstler"
DUPLICATES_DIR = "_Duplikate"
INVALID_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
RESERVED = {"CON", "PRN", "AUX", "NUL", *(f"COM{i}" for i in range(1, 10)), *(f"LPT{i}" for i in range(1, 10))}
MAX_FRAME = 65536

FRAME_KEYS = {
    "TIT2": "title", "TPE1": "artist", "TPE2": "album_artist", "TALB": "album",
    "TRCK": "track", "TPOS": "disc", "TYER": "year", "TDRC": "year",
    "TT2": "title", "TP1": "artist", "TP2": "album_artist", "TAL": "album",
    "TRK": "track", "TPA": "disc", "TYE": "year",
}


# ----------------------------------------------------------------- Tags lesen
def _synchsafe(b):
    return (b[0] << 21) | (b[1] << 14) | (b[2] << 7) | b[3]


def _decode_text(data):
    if not data:
        return ""
    enc, raw = data[0], data[1:]
    try:
        if enc == 1:
            s = raw.decode("utf-16")
        elif enc == 2:
            s = raw.decode("utf-16-be")
        elif enc == 3:
            s = raw.decode("utf-8")
        else:
            s = raw.decode("latin-1")
    except UnicodeDecodeError:
        s = raw.decode("latin-1", errors="replace")
    return s.split("\x00")[0].strip()


def _read_id3v2(f):
    f.seek(0)
    head = f.read(10)
    if len(head) < 10 or head[:3] != b"ID3" or head[3] not in (2, 3, 4):
        return {}
    ver, flags = head[3], head[5]
    if any(b & 0x80 for b in head[6:10]):
        return {}
    end = 10 + _synchsafe(head[6:10])
    pos = 10
    if ver >= 3 and flags & 0x40:  # erweiterter Header
        f.seek(10)
        ext = f.read(4)
        if len(ext) < 4:
            return {}
        pos = 10 + (_synchsafe(ext) if ver == 4 else struct.unpack(">I", ext)[0] + 4)
    hl = 6 if ver == 2 else 10
    tags = {}
    while pos + hl <= end:
        f.seek(pos)
        hdr = f.read(hl)
        if len(hdr) < hl:
            break
        if ver == 2:
            fid, fsize, fflags = hdr[:3], int.from_bytes(hdr[3:6], "big"), 0
        else:
            fid = hdr[:4]
            fsize = _synchsafe(hdr[4:8]) if ver == 4 else struct.unpack(">I", hdr[4:8])[0]
            fflags = struct.unpack(">H", hdr[8:10])[0]
        if not re.fullmatch(rb"[A-Z0-9]{3,4}", fid):
            break  # Padding oder Muell
        if fsize <= 0 or pos + hl + fsize > end:
            break
        key = FRAME_KEYS.get(fid.decode("ascii"))
        unusable = (ver == 4 and fflags & 0x000C) or (ver == 3 and fflags & 0x00C0)
        if key and not unusable and key not in tags and fsize <= MAX_FRAME:
            payload = f.read(fsize)
            if ver == 4 and fflags & 0x0001:  # Data-Length-Indicator
                payload = payload[4:]
            text = _decode_text(payload)
            if text:
                tags[key] = text
        pos += hl + fsize
    return tags


def _read_id3v1(f, size):
    if size < 128:
        return {}
    f.seek(size - 128)
    b = f.read(128)
    if b[:3] != b"TAG":
        return {}

    def txt(x):
        return x.split(b"\x00")[0].decode("latin-1").strip()

    tags = {"title": txt(b[3:33]), "artist": txt(b[33:63]), "album": txt(b[63:93])}
    if b[125] == 0 and b[126] != 0:
        tags["track"] = str(b[126])
    return {k: v for k, v in tags.items() if v}


def read_tags(path):
    try:
        with open(path, "rb") as f:
            size = os.fstat(f.fileno()).st_size
            tags = _read_id3v2(f)
            for k, v in _read_id3v1(f, size).items():
                tags.setdefault(k, v)
            return tags
    except OSError:
        return {}


# ------------------------------------------------------------ Namen ableiten
FILE_TRACK = re.compile(r"^(\d{1,3})\s*[-._)]\s*(?=\D)")
FILE_SPLIT = re.compile(r"\s+[-–—]\s+")


def parse_filename(stem):
    s, track = stem.strip(), None
    m = FILE_TRACK.match(s)
    if m:
        track, s = int(m.group(1)), s[m.end():]
    parts = FILE_SPLIT.split(s, maxsplit=1)
    if len(parts) == 2 and parts[0].strip() and parts[1].strip():
        return parts[0].strip(), parts[1].strip(), track
    return None, s.strip(), track


def parse_number(text):
    m = re.match(r"\s*(\d+)", text or "")
    return int(m.group(1)) if m else None


def first_name(text):
    return re.split(r"[;\x00]", text or "", maxsplit=1)[0].strip()


def sanitize(name, fallback):
    name = INVALID_CHARS.sub("_", name or "")
    name = re.sub(r"\s+", " ", name).strip().strip(".").strip()
    if not name:
        return fallback
    if name.split(".")[0].upper() in RESERVED:
        name = "_" + name
    return name[:100].rstrip(". ") or fallback


def plan(path):
    """Gibt (Künstlerordner, Albumordner, Dateiname) fuer eine MP3 zurueck."""
    tags = read_tags(path)
    f_artist, f_title, f_track = parse_filename(Path(path).stem)
    title = tags.get("title") or f_title or Path(path).stem
    artist = first_name(tags.get("album_artist") or tags.get("artist") or f_artist or "") or UNKNOWN_ARTIST
    album = (tags.get("album") or "").strip()
    track = parse_number(tags.get("track")) or f_track
    disc = parse_number(tags.get("disc"))

    artist_dir = sanitize(artist, UNKNOWN_ARTIST)
    safe_title = sanitize(title, "Unbekannter Titel")
    if album:
        album_dir = sanitize(album, "Unbekanntes Album")
        prefix = ""
        if track:
            prefix = (f"{disc}-" if disc and disc > 1 else "") + f"{track:02d} - "
        return artist_dir, album_dir, f"{prefix}{safe_title}.mp3"
    return artist_dir, sanitize(f"{title} - Single", "Single"), f"{safe_title}.mp3"


# ------------------------------------------------------------- Einsortieren
def find_dir(parent, name):
    """Vorhandenen Ordner ohne Beachtung der Gross-/Kleinschreibung wiederverwenden."""
    try:
        with os.scandir(parent) as it:
            for entry in it:
                if entry.is_dir(follow_symlinks=False) and entry.name.casefold() == name.casefold():
                    return Path(entry.path)
    except OSError:
        pass
    return Path(parent) / name


def _sha1(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.digest()


def unique_path(path):
    if not path.exists():
        return path
    n = 2
    while True:
        cand = path.with_name(f"{path.stem} ({n}){path.suffix}")
        if not cand.exists():
            return cand
        n += 1


def inside(child, parent):
    try:
        Path(child).resolve().relative_to(Path(parent).resolve())
        return True
    except ValueError:
        return False


def sort_inbox(inbox, library, min_age=30, dry_run=False, log=print):
    inbox, library = Path(inbox), Path(library)
    if inside(library, inbox) or inside(inbox, library):
        raise ValueError("Eingang und Bibliothek duerfen sich nicht ueberlappen.")
    moved = skipped = dups = 0
    now = time.time()
    for root, dirs, files in os.walk(inbox, followlinks=False):
        dirs[:] = [d for d in dirs if d != DUPLICATES_DIR]
        for name in sorted(files):
            src = Path(root) / name
            if not name.lower().endswith(".mp3") or src.is_symlink():
                continue
            try:
                if now - src.stat().st_mtime < min_age:
                    skipped += 1
                    continue
                artist_dir, album_dir, fname = plan(src)
            except OSError as e:
                log(f"UEBERSPRUNGEN {src}: {e}")
                skipped += 1
                continue
            a_dir = find_dir(library, artist_dir)
            b_dir = find_dir(a_dir, album_dir)
            target = b_dir / fname
            if not inside(target, library):
                log(f"UEBERSPRUNGEN (Pfad ausserhalb): {src}")
                skipped += 1
                continue
            if target.exists() and target.stat().st_size == src.stat().st_size and _sha1(target) == _sha1(src):
                dup_dir = inbox / DUPLICATES_DIR
                dest = unique_path(dup_dir / name)
                log(f"DUPLIKAT {src} -> {dest}")
                dups += 1
            else:
                dest = unique_path(target)
                log(f"{src} -> {dest}")
                moved += 1
            if not dry_run:
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(src), str(dest))
    if not dry_run:  # leere Unterordner im Eingang aufraeumen
        for root, dirs, files in os.walk(inbox, topdown=False, followlinks=False):
            p = Path(root)
            if p != inbox and DUPLICATES_DIR not in p.parts[len(inbox.parts):]:
                try:
                    p.rmdir()
                except OSError:
                    pass
    return moved, dups, skipped


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inbox")
    ap.add_argument("library")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--min-age", type=int, default=30, help="Dateien juenger als N Sekunden ueberspringen")
    ap.add_argument("--watch", type=int, default=0, help="alle N Sekunden wiederholen")
    a = ap.parse_args()
    while True:
        m, d, s = sort_inbox(a.inbox, a.library, a.min_age, a.dry_run)
        print(f"fertig: {m} einsortiert, {d} Duplikate, {s} uebersprungen")
        if not a.watch:
            break
        time.sleep(a.watch)


if __name__ == "__main__":
    sys.exit(main())
