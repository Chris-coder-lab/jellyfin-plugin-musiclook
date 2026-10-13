# Music Look (Jellyfin 12.x)

Ändert nur den Look des Musik-Bereichs der Web-Oberfläche und ergänzt Plus-Button, Playlist-Teilen, Wischen zwischen Reitern und Jam.

## Voraussetzungen
- Jellyfin 12.0 oder neuer
- Plugin **File Transformation 3.0.0.0 oder neuer** (fügt das Script in die Web-Oberfläche ein)
- Funktioniert in der Web-Oberfläche und in der offiziellen Android-App (Web-Wrapper). Nicht in Swiftfin, Findroid oder nativen TV-Apps.

## Bauen und veröffentlichen
1. Ordner als GitHub-Repository `jellyfin-plugin-musiclook` hochladen.
2. Tag setzen: `git tag v0.1.0.0 && git push --tags`. Der Workflow baut die ZIP und legt ein Release an.
3. `python3 scripts/update_manifest.py musiclook_0.1.0.0.zip DEIN-GITHUB-NAME 0.1.0.0` ausführen und `manifest.json` einchecken.

## Installieren
Jellyfin → Dashboard → Plugins → Repositories → neues Repository:
`https://raw.githubusercontent.com/DEIN-GITHUB-NAME/jellyfin-plugin-musiclook/main/manifest.json`

Dann im Katalog zuerst File Transformation, danach Music Look installieren und Jellyfin neu starten.

## Ohne File Transformation
Im Log erscheint dann eine Warnung. Als Notlösung `/MusicLook/client.css` und `/MusicLook/client.js` manuell in die `index.html` des Web-Clients einbinden.

## Alle MP3-Dateien einfach in einen Ordner legen
Jellyfin erwartet pro Album einen eigenen Ordner; liegen mehrere Alben gemischt in einem Ordner, werden sie zu einem Sammel-Album zusammengefasst. Deshalb sortiert das Plugin auf Wunsch selbst:

1. Dashboard → Plugins → Music Look: „Eingangsordner automatisch einsortieren“ aktivieren.
2. Eingangsordner (hier legst du alles hinein) und Musikordner (der in Jellyfin als Musik-Bibliothek eingetragen ist) als absolute Pfade eintragen. Beide dürfen sich nicht überlappen.
3. Der Jellyfin-Dienst braucht Schreibrechte auf beide Ordner (bei Docker: beide als Volume einbinden).

Ablauf pro MP3 (Eingang inklusive Unterordner):
- Quelle: ID3-Tags (v2.2/2.3/2.4, sonst v1), danach der Dateiname, z. B. `Künstler - Titel.mp3` oder `03 - Titel.mp3`.
- Ziel mit Album-Tag: `Künstler/Album/05 - Titel.mp3` (mehrere Discs: `2-05 - Titel.mp3`). Künstlerordner = Album-Künstler, sonst erster Künstler.
- Ohne Album-Tag: `Künstler/Titel - Single/Titel.mp3`. Ohne Künstler: `Unbekannter Künstler`.
- Vorhandene Ordner werden ohne Beachtung der Groß-/Kleinschreibung weiterverwendet.
- Nichts wird überschrieben oder gelöscht. Gleicher Name, anderer Inhalt: `(2)` am Dateinamen. Identische Datei: `Eingang/_Duplikate`.
- Dateien jünger als 30 Sekunden (Upload läuft noch) werden übersprungen.
- Danach muss Jellyfin die Bibliothek neu einlesen (Scan).

Dieselbe Logik gibt es als eigenständiges Skript für die NAS: `python3 tools/sort_inbox.py EINGANG MUSIK --dry-run` (ohne `--dry-run` wird verschoben, `--watch 60` wiederholt alle 60 Sekunden). Tests: `cd tools && python3 -m unittest test_sort_inbox` (braucht ffmpeg).

## Sicherheit
- Jam-Endpunkte nur für angemeldete Benutzer, Mitgliedschaft wird pro Anfrage geprüft.
- Jam speichert nur Titel-IDs (keine Titel), Codes aus 6 zufälligen Zeichen, Begrenzung bei Fehlversuchen, 6 Stunden Lebensdauer.
- Das Script sendet nichts nach außen.
