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
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
plugin = manifest[0]
plugin["owner"] = user
entry = next((v for v in plugin["versions"] if v["version"] == version), None)
if entry is None:
    entry = dict(plugin["versions"][0])
    entry["version"] = version
    plugin["versions"].insert(0, entry)
entry["checksum"] = md5
repo = os.environ.get("GITHUB_REPOSITORY") or f"{user}/jellyfin-plugin-musiclook"  # in GitHub Actions gesetzt
entry["sourceUrl"] = f"https://github.com/{repo}/releases/download/v{version}/{zip_path.name}"
entry["timestamp"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
# Platzhalter-Eintraege (noch ohne echte Pruefsumme) entfernen, damit Jellyfin nie einen kaputten Eintrag sieht
plugin["versions"] = [v for v in plugin["versions"] if v is entry or not v["checksum"].startswith("WIRD-VON")]
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"{zip_path.name}: MD5 {md5}")
