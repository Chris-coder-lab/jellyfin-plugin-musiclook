#!/usr/bin/env python3
"""Setzt in manifest.json nur den Aenderungstext einer bereits veroeffentlichten Version neu (aus CHANGELOG.md).

Aufruf: python3 scripts/set_changelog.py <version>
"""
import json
import sys
from pathlib import Path

version = sys.argv[1]
root = Path(__file__).resolve().parent.parent
manifest_path = root / "manifest.json"
lines, take = [], False
for line in (root / "CHANGELOG.md").read_text(encoding="utf-8").splitlines():
    if line.startswith("## "):
        if take:
            break
        take = line[3:].strip() == version
        continue
    if take and line.strip():
        lines.append(line.strip())
if not lines:
    sys.exit(f"Kein Abschnitt '## {version}' in CHANGELOG.md gefunden")
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
entry = next((v for v in manifest[0]["versions"] if v["version"] == version), None)
if entry is None:
    sys.exit(f"Version {version} steht nicht in manifest.json")
entry["changelog"] = "\n".join(lines)
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Aenderungstext fuer {version} gesetzt ({len(lines)} Zeilen)")
