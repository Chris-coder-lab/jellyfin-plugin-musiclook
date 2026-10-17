# Music Look (Jellyfin 12.x)

Verwandelt **nur Musik-Bibliotheken** der Web-Oberfläche in eine Spotify-ähnliche App-Ansicht (Startseite mit Playlists, Playlist-Seiten, Player) und ergänzt Playlist-Teilen, Cover, Beschreibungen, ZIP-Download und Jam. Alle anderen Bereiche von Jellyfin (Filme, Serien, Dashboard …) bleiben unverändert.

## Voraussetzungen
- Jellyfin 12.0 oder neuer (getestet gegen den Quellcode von 12.0 und 12.2)
- Kein weiteres Plugin nötig: Das Plugin fügt sein Script selbst in die Startseite der Web-Oberfläche ein.
- Funktioniert in der Web-Oberfläche und in der offiziellen Android-App (Web-Wrapper). Nicht in Swiftfin, Findroid oder nativen TV-Apps.

## Bauen und veröffentlichen
1. Ordner als GitHub-Repository `jellyfin-plugin-musiclook` hochladen.
2. Neuen Tag mit **vier** Zahlen setzen und pushen, z. B. `git tag v1.0.3.0 && git push origin v1.0.3.0`.
3. Der Workflow baut die ZIP, legt das Release an und trägt die neue Version selbst in `manifest.json` ein (Bot-Commit auf `main`). Vor dem nächsten Tag deshalb `git pull` ausführen.

## Installieren
Jellyfin → Dashboard → Plugins → Repositories → neues Repository:
`https://raw.githubusercontent.com/DEIN-GITHUB-NAME/jellyfin-plugin-musiclook/main/manifest.json`

Dann im Katalog Music Look installieren, Jellyfin neu starten und die Web-Oberfläche mit Strg+F5 neu laden (in der Android-App: App-Daten/Cache leeren).

## Funktionen
**Wo das Plugin aktiv ist:** nur auf der Startseite einer Musik-Bibliothek (`#/music`) sowie auf den Seiten von Playlists und Alben. Dort ersetzt eine Overlay-Ansicht die Standardseite; über „Klassische Ansicht“ im Profilmenü (Avatar oben links) kommst du zur Standard-Ansicht (und mit dem grünen Knopf „Spotify-Ansicht“ unten rechts wieder zurück). Die klassische Ansicht gilt nur bis zum Neustart der App bzw. des Tabs.

**Startseite (mobil wie Spotify):**
- Oben Profilbild und Chips **Alle · Musik · Podcasts · Hörbücher**.
- Schnellzugriff (Lieblingssongs + deine ersten Playlists), darunter die Reihen **Deine Playlists** (mit „Neue Playlist“), **Mit dir geteilt**, **Zuletzt gespielt**, **Neu hinzugefügt**.
- Untere Leiste **Start · Suche · Bibliothek**, darüber der Mini-Player.
- **Podcasts / Hörbücher:** Das sind Bibliotheken, deren *Name* eines der Stichwörter aus den Plugin-Einstellungen enthält (Standard: `podcast,predigt` bzw. `hörbuch,hörbücher,audiobook,hörspiel`; Umlaute werden gleich behandelt). Gibt es keine solche Bibliothek, erklärt der Chip das.
- **Suche:** ohne Suchbegriff **alle Titel der Musikbibliothek in einer alphabetischen Liste** (mit Abspielen und Zufall, 100 pro Seite, „Mehr laden“); mit Suchbegriff Treffer für Titel, Alben, Künstler und Playlists. **Bibliothek:** Playlists, Alben, Künstler.
- Die Standard-Bedienelemente von Jellyfin in Musikbibliotheken (Alben/Play/Zufall/Filter, A–Z-Leiste, Kachel-/Listenansicht, Seitenpfeile, „1–100 von 407“) werden dort ausgeblendet; außerhalb von Musik und in der klassischen Ansicht bleiben sie unverändert.

**Playlist-Seite:**
- Cover oben: dein eigenes Bild, sonst ein Platzhalter aus vier Alben-Covern der enthaltenen Titel. Darunter Name, Beschreibung, Besitzer mit Profilbild und „+“ (Personen hinzufügen), Laufzeit (z. B. „7 Std. 32 Min.“), Titelanzahl, Privat/Öffentlich.
- Aktionen: Herunterladen, Teilen, Drei-Punkte-Menü, Zufall, Abspielen.
- Drei-Punkte-Menü: Teilen, Zu dieser Playlist hinzufügen, Playlist bearbeiten (Titel nach oben/unten schieben, entfernen), Name und Details (Name, Beschreibung, Cover), Cover ändern, Playlist löschen (löscht **nie** die Titel selbst), Herunterladen, Zur Warteschlange hinzufügen, Zu einer anderen Playlist hinzufügen, Mitwirkende einladen, Jam starten, Auf privat/öffentlich umstellen. Bei Playlists anderer Personen statt Löschen: „Aus meiner Bibliothek entfernen“.
- Jeder Titel (auch in Alben): kleines Cover links statt Nummer, Titel groß, Künstler darunter, rechts Menü: Teilen, Zu Playlist hinzufügen, Aus Lieblingssongs, Aus dieser Playlist entfernen, Zur Warteschlange, Album anzeigen, Künstler*in aufrufen, Geschwindigkeit ändern, Jam starten, Zum Song-Radio, Songinfos.

**Player (wie Spotify):** Mini-Player (Farbe passt sich dem Cover an, zeigt bei Fremdgeräten „Auf <Gerät>“) und Titelseite mit großem Cover, Titel, Künstler, Herz, **„+“ (zu Playlist hinzufügen)**, Fortschrittsleiste, Zufall, Zurück/Pause/Weiter, Wiederholen, Geräte, Geschwindigkeit, Teilen, Warteschlange. Alle Farben der Seite folgen dynamisch dem Cover. Scrollst du nach unten, siehst du Karten für **Songtext**, **Als Nächstes aus der Warteschlange**, **Über den Künstler** (Beschreibung aus Jellyfin) und **Credits** (Interpret, Komponist, Texter, Album, Jahr, Genre, Songinfos); oben bleibt dann eine **kompakte Leiste mit Titel, Künstler und Pause/Weiter**.

**Songtext ohne Whisper:** Der Songtext kommt aus Jellyfins eigener Songtext-Funktion. Jellyfin liest Dateien mit **exakt demselben Namen wie die Musikdatei** und der Endung `.lrc` (synchron, Zeile wird mitgeführt) oder `.txt` (unsynchron), die im selben Ordner liegen, zum Beispiel `Luna Vale - Neonlicht.mp3` und `Luna Vale - Neonlicht.lrc`. Der Eingangsordner-Sortierer verschiebt diese Dateien jetzt mit der MP3 und benennt sie passend um. Ohne passende Datei zeigt die Karte einen Hinweis; es wird nie geraten oder automatisch aus dem Internet geladen.

**Gerätewechsel:** Das Geräte-Symbol (Mini-Player und Titelseite) listet alle Jellyfin-Sitzungen **deines** Kontos, die sich fernsteuern lassen (z. B. Laptop im Browser, anderes Handy). Antippen überträgt Warteschlange und Position dorthin und stoppt das aktuelle Gerät. Darin auch die Lautstärke. Den internen Lautsprecher oder Bluetooth-Geräte des Handys stellt das Betriebssystem ein; das kann eine Web-Seite nicht übernehmen.

**Playlists pro Benutzer, teilbar:** Playlists gehören dem jeweiligen Benutzer (so speichert Jellyfin sie). Der Besitzer kann sie mit einzelnen Benutzern teilen (lesen oder mitbearbeiten) – über das „+“ neben seinem Namen oder im Teilen-Menü. Neue Playlists sind privat. Ausgeblendete und deaktivierte Konten werden nicht angeboten.

**Cover und Beschreibung für alle Benutzer:** Jellyfin erlaubt das Setzen von Bild und Beschreibung sonst nur Administratoren. Das Plugin stellt dafür eigene Endpunkte bereit, die für den Besitzer (und Mitbearbeiter) der Playlist gelten.

**Herunterladen:** Packt die Titel einer Playlist als ZIP und lädt sie auf das Gerät (nur Titel, die der Benutzer herunterladen darf). In der offiziellen Android-App wird dafür deren Download-Funktion genutzt, im Browser der normale Download.

**Jam:** Gemeinsame Warteschlange. Jemand startet einen Jam und bekommt einen 6-stelligen Code, andere treten bei und hängen Titel hinten an. Reihenfolge ist für alle gleich. Sitzungen liegen nur im Arbeitsspeicher und enden nach 6 Stunden ohne Aktivität oder beim Neustart von Jellyfin.

**Look in der klassischen Ansicht:** Abgerundete Karten, Reiter als Chips, Wischen zwischen Reitern, Plus-Button bei Titeln/Alben/Künstlern, Schrift Figtree (vom Plugin selbst ausgeliefert), Akzentfarbe einstellbar.

**Künstlerseite:** Antippen eines Künstlers öffnet eine eigene Seite (schwarzer Hintergrund) mit Beliebten Titeln, Alben, Abspielen und Zufall.

**Hintergrund:** Im Musik-Bereich wird das Hintergrundbild des Jellyfin-Themes („purple haze“) vollständig entfernt, damit nichts mehr durchscheint.

**Computer-Ansicht (ab 900 px Fensterbreite):** links die Bibliothek mit Chips (Playlists · Alben · Künstler) und „+“ für neue Playlists, in der Mitte der Inhalt mit Farbverlauf und Titeltabelle (Nummer/Abspielen, Titel, Album, Dauer, Herz, Menü), rechts die Ansicht des laufenden Titels (Cover, Künstlerkarte), unten die Player-Leiste (Titel, Zufall, Zurück, Pause, Weiter, Wiederholen, Fortschritt, Lautstärke, Geräte, Warteschlange, Vollbild). Unter 900 px bleibt es die Handy-Ansicht. Das Profilmenü (unten links „Menü“) enthält zusätzlich Dashboard und Einstellungen.

**Zurück-Taste:** Titelansicht, Warteschlange, Menüs und Dialoge sind eigene Schritte im Browserverlauf. „Zurück“ (auch die Zurück-Geste auf dem Handy) schließt zuerst sie und führt nie ungewollt zur Jellyfin-Startseite; der Pfeil in Playlists führt zur vorherigen Seite der App.

**Teilen:** „Link kopieren“ erzeugt eine Adresse der Web-Oberfläche (`…/web/index.html#/details?id=…`) auf Basis der Serveradresse oder der Einstellung „Link-Adresse für Teilen“. WhatsApp macht aber nur Adressen mit echtem Domainnamen anklickbar (`https://musik.beispiel.de/…`), keine IP-Adressen wie `192.168.…` oder `localhost`; bei solchen Adressen zeigt der Dialog einen Hinweis.

**Schnell beim Öffnen:** Playlists, Bibliotheken und Playlist-Cover werden im Browser gemerkt und sofort angezeigt, der Server aktualisiert sie im Hintergrund (wichtig bei laufendem Bibliotheksscan). Bekannte Musik-Seiten werden schon beim Laden abgedeckt, damit das alte Jellyfin-Layout nicht kurz aufblitzt.

## Plugin-Einstellungen
Dashboard → Plugins → Music Look: Akzentfarbe, Spotify-Ansicht ein/aus, Stichwörter für Podcast- und Hörbuch-Bibliotheken (Standard Hörbuch: `hörbuch,hörbücher,audiobook,hörspiel`), Link-Adresse für „Teilen“, Jam ein/aus und maximale Teilnehmer, Eingangsordner-Sortierung.

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

Songtext-Dateien (`.lrc`, `.elrc`, `.txt`) mit gleichem Namen wie die MP3 wandern mit.

**Sammelordner wie „Cinderella“:** Jellyfin benennt ein Album nach dem Album-Tag des ersten Titels im Ordner und fasst alle Dateien des Ordners dazu zusammen. Das Plugin legt von sich aus **keine** Playlists an. Liegen Titel aus verschiedenen Alben in einem Ordner, zeigt die Albumseite „Verschiedene Künstler“, einen Hinweis und die Titel nach Album-Tag gruppiert. Dauerhaft lösen: den Ordner in den Eingangsordner verschieben, dann sortiert das Plugin nach Tags in Künstler/Album.

Dieselbe Logik gibt es als eigenständiges Skript für die NAS: `python3 tools/sort_inbox.py EINGANG MUSIK --dry-run` (ohne `--dry-run` wird verschoben, `--watch 60` wiederholt alle 60 Sekunden). Tests: `cd tools && python3 -m unittest test_sort_inbox` (braucht ffmpeg).

## Grenzen
- **Nicht umgesetzt, weil Jellyfin dafür nichts bietet:** „Zu Video wechseln“ und „Playlist/Titel aus dem Geschmacksprofil ausschließen“ (dafür gibt es in Jellyfin keine Entsprechung).
- **Download = ZIP-Datei auf dem Gerät.** Ein Offline-Abspielen innerhalb von Jellyfin bietet die Web-Oberfläche nicht; laut Jellyfin-Forum hat auch die offizielle Android-App keinen Offline-Modus (Findroid als Fremd-App kann heruntergeladene Titel offline abspielen).
- Jam synchronisiert die Warteschlange, nicht die Wiedergabeposition: Pause und Spulen sind pro Gerät.
- Nicht umgesetzt: Hörerzahlen pro Monat bei Künstlern (Jellyfin kennt sie nicht), Umschalten zwischen Lautsprecher und Bluetooth (Sache des Betriebssystems).
- Der Player folgt der Wiedergabe des Web-Clients auf dem eigenen Gerät; die Position wird alle paar Sekunden abgeglichen.
- Playlist-Cover aus Titeln werden im Browser aus Alben-Covern zusammengesetzt; ein hochgeladenes Bild wird als JPEG bis 800 × 800 gespeichert.
- Jellyfin 12.2 bringt bereits einen „Zur Playlist hinzufügen“-Knopf und einen Öffentlich/Privat-Schalter mit; die klassische Ansicht ergänzt das um den Plus-Button an Karten und das Teilen mit einzelnen Benutzern.
- Pause, Spulen und Lautstärke wirken sofort nur auf diesem Gerät; Weiter, Zurück, Zufall und Wiederholen laufen weiter über Jellyfins Sitzungs-Schnittstelle.
- Das Plugin ist gegen den Quellcode von Jellyfin 12.0/12.2 und im Browser mit einer nachgebauten Seite geprüft (über 140 automatische Prüfungen im Browser, dazu 18 Tests des Sortierers), nicht in einer laufenden Jellyfin-12-Installation.

## Sicherheit
- Jam-Endpunkte nur für angemeldete Benutzer, Mitgliedschaft wird pro Anfrage geprüft.
- Jam speichert nur Titel-IDs (keine Titel). Beim Hinzufügen wird geprüft, dass der Benutzer den Titel sehen darf. Codes aus 6 zufälligen Zeichen, Begrenzung bei Fehlversuchen.
- Das Script sendet nichts nach außen; die Schrift kommt vom eigenen Server.
- Playlist-Endpunkte prüfen pro Anfrage, ob der Benutzer die Playlist sehen bzw. bearbeiten darf; Cover-Upload nur als JPEG bis 2,5 MB, Beschreibung bis 500 Zeichen.
- Der ZIP-Download enthält nur Titel, die der Benutzer sehen und herunterladen darf. Für den Download aus dem Browser wird das Anmelde-Token in der Adresse mitgegeben (wie bei Jellyfins eigenem Download-Link).

## Lizenzen
Die Schrift Figtree steht unter der SIL Open Font License 1.1 (`FONT-LICENSE-OFL.txt`). Die Symbole der App-Ansicht sind nach den Material Design Icons von Google gezeichnet (Apache License 2.0, https://github.com/google/material-design-icons).
