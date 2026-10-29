# Mitmachen

Danke, dass du helfen möchtest! Music Look ist ein Plugin für Jellyfin 12.x.

## Fehler und Wünsche
Über [Issues](https://github.com/Chris-coder-lab/jellyfin-plugin-musiclook/issues/new/choose) mit der passenden Vorlage. Wichtig sind: Music-Look-Version, Jellyfin-Version, Browser bzw. Android-App und was genau passiert. Bitte keine Passwörter, Tokens oder privaten Adressen posten.

## Code
- Die Oberfläche ist eine JavaScript-Datei (`Jellyfin.Plugin.MusicLook/Web/musiclookapp.js`) plus `musiclook.css`; das Plugin selbst (C#) liefert diese Dateien aus und stellt wenige eigene Endpunkte bereit (Jam, Playlist-Cover, ZIP-Download, Spotify-Abgleich).
- Eine Änderung sollte klein und nachvollziehbar sein, ein Pull Request möglichst nur ein Thema behandeln.
- Das Projekt ist nur für **Jellyfin 12.x** gedacht; Rücksicht auf ältere Versionen ist nicht nötig.
- Der Sortierer für den Eingangsordner (`tools/sort_inbox.py`) hat Tests: `cd tools && python3 -m unittest test_sort_inbox` (braucht `ffmpeg`).
- Releases entstehen durch einen Tag mit **vier** Zahlen (z. B. `v2.0.2.0`); der Workflow `.github/workflows/build.yml` baut, veröffentlicht und trägt die Version in `manifest.json` ein.

## Ton
Freundlich bleiben. Das Plugin ist nicht von Spotify; bitte keine Spotify-Inhalte (Cover, Logos, Texte) in Pull Requests übernehmen.
