# Music Look (Jellyfin 12.x)

Ändert nur den Look des Musik-Bereichs der Web-Oberfläche (runde Ecken, Figtree-Schrift, Spotify-ähnliche Farben, Reiter als Chips) und ergänzt Plus-Button, Playlist-Teilen, Wischen zwischen Reitern und Jam.

## Voraussetzungen
- Jellyfin 12.0 oder neuer (getestet gegen den Quellcode von 12.0 und 12.2)
- Kein weiteres Plugin nötig: Das Plugin fügt sein Script selbst in die Startseite der Web-Oberfläche ein.
- Funktioniert in der Web-Oberfläche und in der offiziellen Android-App (Web-Wrapper). Nicht in Swiftfin, Findroid oder nativen TV-Apps.

## Bauen und veröffentlichen
1. Ordner als GitHub-Repository `jellyfin-plugin-musiclook` hochladen.
2. Neuen Tag mit **vier** Zahlen setzen und pushen, z. B. `git tag v0.1.0.3 && git push origin v0.1.0.3`.
3. Der Workflow baut die ZIP, legt das Release an und trägt die neue Version selbst in `manifest.json` ein (Bot-Commit auf `main`). Vor dem nächsten Tag deshalb `git pull` ausführen.

## Installieren
Jellyfin → Dashboard → Plugins → Repositories → neues Repository:
`https://raw.githubusercontent.com/Chris-coder-lab/jellyfin-plugin-musiclook/main/manifest.json`

Dann im Katalog Music Look installieren, Jellyfin neu starten und die Web-Oberfläche mit Strg + Shift + F5 neu laden und Cookies und website daten löschen und einmal neu anmelden (in der Android-App: App-Daten/Cache leeren).

## Funktionen
- **Look:** Nur im Musik-Bereich. Abgerundete Karten und Listen, Reiter als Chips, Schrift Figtree (wird vom Plugin selbst ausgeliefert, keine externen Anfragen). Akzentfarbe in den Plugin-Einstellungen änderbar.
- **Wischen:** Auf Musik-Seiten nach links/rechts wischen wechselt den Reiter.
- **Plus-Button:** Bei Titeln, Alben und Künstlern. Wählt eine eigene Playlist oder legt eine neue an. Neue Playlists sind privat.
- **Playlists teilen:** Eigene Playlist mit anderen Benutzern teilen (lesen oder mitbearbeiten). Ausgeblendete und deaktivierte Konten werden nicht angeboten.
- **Jam:** Gemeinsame Warteschlange. Jemand startet einen Jam und bekommt einen 6-stelligen Code, andere treten bei und hängen Titel hinten an. Reihenfolge ist für alle gleich. Sitzungen liegen nur im Arbeitsspeicher und enden nach 6 Stunden ohne Aktivität oder beim Neustart von Jellyfin.

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
- Nach dem Einsortieren stößt das Plugin einen Bibliotheks-Scan an, sobald der Eingang ruhig ist (spätestens nach 10 Minuten).

Dieselbe Logik gibt es als eigenständiges Skript für die NAS: `python3 tools/sort_inbox.py EINGANG MUSIK --dry-run` (ohne `--dry-run` wird verschoben, `--watch 60` wiederholt alle 60 Sekunden). Tests: `cd tools && python3 -m unittest test_sort_inbox` (braucht ffmpeg).

## Grenzen
- Jellyfin 12.2 bringt bereits einen „Zur Playlist hinzufügen“-Knopf in Titel- und Albumlisten und einen Öffentlich/Privat-Schalter im Playlist-Editor mit. Das Plugin ergänzt das um den Plus-Button an Karten und das Teilen mit einzelnen Benutzern.
- Jam synchronisiert die Warteschlange, nicht die Wiedergabeposition: Pause und Spulen sind pro Gerät.
- Cover aus der Datei oder per Spotify-ID gibt es nicht; Jellyfin liest eingebettete Cover und `cover.jpg` im Albumordner selbst.
- Das Plugin ist nur gegen den Quellcode von Jellyfin und im Browser mit einer nachgebauten Seite geprüft, nicht in einer laufenden Jellyfin-12-Installation.

## Sicherheit
- Jam-Endpunkte nur für angemeldete Benutzer, Mitgliedschaft wird pro Anfrage geprüft.
- Jam speichert nur Titel-IDs (keine Titel). Beim Hinzufügen wird geprüft, dass der Benutzer den Titel sehen darf. Codes aus 6 zufälligen Zeichen, Begrenzung bei Fehlversuchen.
- Das Script sendet nichts nach außen; die Schrift kommt vom eigenen Server.

## Lizenzen
Die Schrift Figtree steht unter der SIL Open Font License 1.1 (`FONT-LICENSE-OFL.txt`).
