# Änderungen

## 2.1.0.0
- **Weiter hören in der Wiedergabeleiste:** Am Computer steht „Weiter hören“ jetzt in der unteren Leiste (gleiche Fläche und Aufteilung wie die Wiedergabeleiste: Cover, Titel, Abspielknopf, Zeit und Fortschritt), solange nichts spielt; die Leiste oben links in der Seitenleiste entfällt. Am Handy bleibt sie über der unteren Navigation. Verhalten beim Starten unverändert (gesperrt während des Startens, bis zu drei Versuche, Nachspulen).
- **Konto oben rechts (Computer):** Benutzerbild ohne Namen (Menü: Jellyfin-Kontoeinstellungen, Jellyfin-Startseite, Dashboard für Administratoren, Abmelden falls `Dashboard.logout` vorhanden) und Zahnrad (bisheriges Menü: Playlist anlegen, Spotify-Import, Downloads, Equalizer, Einstellungen usw.). Die Fußleiste mit „Menü“ links unten entfällt.
- **Bibliothek: Sortieren und Ansicht:** Menü mit *Zuletzt*, *Kürzlich hinzugefügt*, *Alphabetisch*, *Ersteller\*in* und vier Ansichten (Liste, kompakte Liste, kleines und großes Raster) in der Seitenleiste und in der Handy-Bibliothek. „Zuletzt“ merkt sich pro Konto, was zuletzt geöffnet oder abgespielt wurde (Anzeige-Einstellungen, Schlüssel `ml_recent`); Alben und Künstler werden serverseitig sortiert (`DateCreated`, `SortName`, bei Alben `AlbumArtist,SortName`), Playlists im Browser. Vorher wechselte der Knopf nur die Beschriftung zwischen „Zuletzt“ und „A–Z“, ohne die Reihenfolge zu ändern.
- **Jellyfin Media Player / ältere Engines (Qt WebEngine):** Erkennung zur Laufzeit (`ml-nogap`, `ml-noar`) für fehlendes Flex-`gap` (Chromium < 84) und `aspect-ratio` (< 88); Abstände werden dann über Außenränder erzeugt (Block am Dateiende), Cover erhalten feste Größen, Chips schrumpfen nicht mehr.
- **GitHub:** `CODE_OF_CONDUCT.md`, Pull-Request-Vorlage, `ACCESSIBILITY.md`, Issue-Vorlagen ohne leere Tickets.

## 2.0.2.0
- **Weiter hören: neuer Platz.** Die Karte oben auf der Startseite entfällt. Die Leiste sitzt dort, wo sonst der Player ist: am Computer ganz oben in der Seitenleiste (über Start und Suche), am Handy direkt über der unteren Leiste. Sie zeigt Cover, Titel, Künstler, die gemerkte Position („Weiter hören · 12:30“), einen dünnen Fortschrittsbalken und den Play-Knopf. Bei Hörbüchern und Podcasts steht „Hörbuch fortsetzen“ bzw. „Folge fortsetzen“. Sie verschwindet, sobald etwas läuft, und erscheint wieder, wenn nichts mehr läuft; mit dem kleinen Kreuz wird der Stand gelöscht.
- **Weiter hören: zuverlässiger.** Leiste und Play-Knopf sind eine einzige Tippfläche (vorher lag ein Knopf im Knopf). Beim Starten ist die Leiste gesperrt und zeigt „wird gestartet …“, schnelles Mehrfachtippen startet nur einmal. Vor dem Befehl wartet das Plugin (bis ca. 6 s), bis die Sitzung dieses Geräts fernsteuerbar ist (direkt nach dem Öffnen der App meldet der Web-Client das erst etwas später). Danach wird geprüft, dass der Titel wirklich läuft; sonst bis zu zwei Wiederholungen. Ignoriert der Client die Startposition, wird nachgespult. Klappt es nicht, bleibt die Leiste stehen und meldet „Fortsetzen hat nicht geklappt“ (vorher verschwand die Karte trotzdem).
- **Weiter hören: aktuell bleiben.** Beim Zurückkehren in die App und bei wiederhergestellter Verbindung wird der Stand neu vom Server gelesen, ohne einen neueren lokalen Stand zu überschreiben.
- **GitHub-Seite:** README mit Bildern (Beispieldaten), Badges, „Auf einen Blick“ und Fragen und Antworten; Vorlagen für Fehler, Wünsche und Fragen; `CONTRIBUTING.md`, `SECURITY.md`; Vorschaubild unter `docs/social-preview.png`.

## 2.0.1.0
- **Alle Bibliotheken am Computer:** Die versteckte Spotify-Ansicht blieb sichtbar, weil `.ml-app.ml-wide { display: grid }` das `hidden`-Attribut überstimmte. Jetzt gilt `display: none !important` für die versteckte Ansicht; zusätzlich wird auch beendet, wenn Jellyfin die Adresse selbst ändert (z. B. mit Zusatz)
- **Bibliothek links (Alben, Künstler):** automatisches Nachladen beim Scrollen, 100 Einträge pro Seite (vorher nur 60 plus „Mehr laden"-Knopf); gilt auch für die Bibliothek in der Handy-Ansicht
- **Weiter hören:** Ein Stand mit nur einem Titel (Sitzung kennt die Warteschlange nicht) überschreibt keine gemerkte vollständige Warteschlange mehr; fehlt sie trotzdem, wird sie aus der Herkunft (Playlist, Album) neu geladen, damit nach dem Titel weitergespielt wird
- **Podcasts und Hörbücher:** Startseite mit Abschnitten statt einer langen Reihe: Zuletzt gehört (mit Fortschrittsbalken, Fortsetzen ab Kapitel und Position), Neueste Folgen bzw. Neu hinzugefügt, Autoren und Sprecher, Alle Podcasts bzw. Hörbücher als Raster

## 2.0.0.0
- **Weiter hören, serverseitig:** Der aktuelle Stand (Warteschlange, Titel, Position, Herkunft wie Playlist/Album/Mix/Hörbuch/Podcast) wird in den Anzeige-Einstellungen des Jellyfin-Kontos gespeichert (alle 20 s, bei Titel- und Pausenwechsel, beim Verlassen der Seite zusätzlich per sendBeacon). Auf der Startseite erscheint die Karte **Weiter hören** (respektiert die Chips Musik/Podcasts/Hörbücher); ein Tipp setzt genau dort fort, wo es endete
- **Computer-Ansicht näher an Spotify:** Kopfleiste mit Home-Knopf und zentriertem Suchfeld über der ganzen Breite, Bibliothek mit Knopf **Erstellen** und Sortierung **Zuletzt / A–Z** (wird gemerkt)
- **Alle Bibliotheken:** Verlassen von Music Look überarbeitet. Der Seitenwechsel wird mehrfach geprüft (Firefox verschluckt den Hash-Wechsel beim Zurücknavigieren), danach folgt ein einmaliger Neuladen-Fallback (höchstens alle 60 s) mit gesichertem Wiedergabestand
- **Jellyfin 12:** Zugriffe über Links (Cover, Downloads, sendBeacon) nutzen `ApiKey` statt der in 12 abgeschalteten Wege `api_key` und `X-Emby-Token`
- **Genres, intelligente Playlists, Statistik, ähnliche Künstler, Einschlaf-Timer:** neue Ansichten und Funktionen (siehe README), pro Konto auf dem Server gespeichert
- **M3U-Export und -Import** für Playlists
- **Spotify-Import:** besserer Abgleich, manuelle Zuordnungen gelten global, entfernte Titel und Reihenfolge werden bei Aktualisierungen übernommen
- **Auffindbarkeit:** README mit Beschreibung und Stichwörtern, ausführlichere Plugin-Beschreibung im Katalog (wird vom Workflow in `manifest.json` geschrieben)

## 1.5.0.0
- **Spotify-Import mit allen Titeln:** Der Playlist-Link liefert bei Spotify höchstens 100 Titel (Grenze der öffentlichen Seite). Die Vorschau weist jetzt darauf hin (mit der Gesamtzahl, wenn Spotify sie nennt) und bietet **Weitere Titel ergänzen** an: Titel-Links einfügen (in Spotify alle Titel markieren, Strg+A, Strg+C; der Server liest jeden Titel einzeln über den neuen Endpunkt `MusicLook/Spotify/Track`, höchstens drei gleichzeitig, mit Fortschritt, Abbrechen und frühem Abbruch, wenn Spotify nichts liefert), den **Spotify-Datenexport** (`Playlist1.json`, bei mehreren Playlists mit Auswahl; Podcast-Folgen werden übersprungen) oder eine **CSV-Datei** (jetzt auch mit Spalte „Track URI“, z. B. Exportify). Zusammengeführt wird ohne Doppelte (gleiche Titel-ID oder gleicher Titel + erster Künstler). Einzelne Titel-Links lassen sich nun ebenfalls einfügen
- **Importierte Playlists aktualisieren:** Beim Erstellen wird die Quelle (alle Spotify-Titel inklusive der fehlenden, Link, Zustand) auf dem Server gespeichert (neue Endpunkte `MusicLook/Spotify/Source/{id}` und `MusicLook/Spotify/Sources`, Datei `spotify-sources.json` im Plugin-Datenordner), damit sie von jedem Gerät aus gilt. Unter den Titeln der Playlist steht der Abschnitt **Spotify-Abgleich**: **Jetzt aktualisieren** (Bibliothek neu laden, Spotify-Link erneut lesen, fehlende Titel abgleichen, Treffer zum Auswählen anzeigen und anhängen), **Weitere Titel ergänzen** und der Schalter **Automatisch aktualisieren** (beim Öffnen von Music Look höchstens einmal täglich, nur sichere Treffer, mit Hinweis). Bewusst abgewählte oder aus der Playlist gelöschte Titel kommen nicht wieder
- **Aufräumen:** Die Quelle einer gelöschten Playlist entfernt der Server selbst; lokal gemerkte „Nicht verfügbar“-Listen älterer Versionen werden beim Öffnen der Playlist auf den Server übernommen und bei gelöschten Playlists entfernt
- **Musik, Podcasts und Hörbücher bleiben in ihrem Reiter:** Die **Suche** hat jetzt dieselben Reiter wie die Startseite (gemeinsame Auswahl) und durchsucht in „Musik“, „Podcasts“ und „Hörbücher“ nur die Bibliotheken des Reiters, in „Alle“ weiterhin alles. **Empfehlungen, Mixe, Sender und Mixtapes** nehmen ihre Lieblingstitel nur noch aus Musik-Bibliotheken; **Lieblingssongs** zeigen im Reiter „Musik“ nur Musik, in „Alle“ auch Favoriten aus Podcasts und Hörbüchern. **Autoplay** hängt nach einer Podcast-Folge oder einem Hörbuch-Kapitel keine Musik an und startet am Ende keinen Mix; **Song-Radio** gibt es nur für Musik; Jellyfins Sofortmix (Rückfall) wird auf Musik gefiltert

## 1.4.0.0
- **Spotify-Playlist importieren:** Neuer Eintrag „Von Spotify importieren“ im Profil-Menü und im Dialog „Neue Playlist“. Playlist-Link einfügen (Spotify: Teilen → Link kopieren): Der Jellyfin-Server liest die öffentliche Einbettungsseite der Playlist (zwei neue Plugin-Endpunkte `MusicLook/Spotify/Playlist` und `MusicLook/Spotify/Image`, nur für angemeldete Benutzer, nur Spotify-Adressen), der Browser liest daraus Name, Beschreibung, Cover und Titelliste. Klappt der Abruf nicht (Spotify ändert die Seite, Server ohne Internet), kann stattdessen eine Titelliste eingefügt („Titel – Künstler“ oder „Künstler – Titel“, die Richtung wird automatisch erkannt) oder eine CSV-Datei geladen werden (Spalten wie in üblichen Export-Tools: Track Name / Artist Name(s) / Album Name / Duration)
- **Abgleich mit der Bibliothek:** Jeder Titel wird mit deinen Titeln verglichen (Titel und Künstler; tolerant bei Klammern, „- Remastered 2011“, „feat. …“, Umlauten und Sonderzeichen, mehreren Künstlern, kleinen Tippfehlern; die Dauer hilft bei mehreren Fassungen). Die Vorschau zeigt je Titel „gefunden“, „ähnlich“ (mit dem gefundenen Titel, abwählbar) oder „nicht verfügbar“, doppelte Treffer werden nur einmal übernommen. Bei sehr großen Bibliotheken (über ca. 6000 Titel) werden fehlende Titel zusätzlich über die Serversuche gesucht
- **Playlist erstellen:** Name und Beschreibung sind vor dem Erstellen änderbar; das Spotify-Cover wird übernommen (abschaltbar). Titel, die du nicht hast, stehen auf der Playlist-Seite eingeklappt unter „Nicht verfügbar (n)“ (nur auf diesem Gerät gemerkt). „Tabelle (CSV)“ speichert die Ergebnisliste (Titel, Künstler, Status, gefundener Titel) für Excel (Semikolon, UTF-8)

## 1.3.1.0
- **Songtext aus .lrc-Dateien wird zeitgenau angezeigt:** Bisher galt ein Songtext nur dann als zeitgenau, wenn Jellyfin zusätzlich „IsSynced = true“ mitschickt. Dieses Feld ist laut Jellyfin-Schnittstelle optional und fehlt je nach Version – dann wurde auch eine .lrc wie reiner Text behandelt (keine Hervorhebung, kein Mitscrollen). Jetzt entscheiden die Zeitmarken der Zeilen: mit Zeitmarken wird die gesungene Zeile hervorgehoben und der Text scrollt mit (Karte, Liste und große Ansicht); ohne Zeitmarken (.txt) erscheint der Text unverändert; ein ausdrückliches „nicht synchron“ von Jellyfin bleibt reiner Text. Zeilen mit Zeitmarken in falscher Reihenfolge werden nach Zeit geordnet. Gilt auch für schon heruntergeladene Songtexte
- **Autoplay am Ende:** Ist der letzte Titel zu Ende, startet jetzt in jedem Fall ein ähnlicher Mix, auch wenn das vorherige Anhängen nicht geklappt hat (Jellyfin ignoriert den Befehl, Seite war im Hintergrund). Erkannt wird das Ende über das Audio-Element von Jellyfin (auch bei ruhender Abfrage), über „Sitzung meldet keinen Titel mehr“ und über „am Ende stehen geblieben“. Bei „Wiederholen“ und ausgeschaltetem Autoplay passiert nichts

## 1.3.0.0
- **Offline-Modus überarbeitet:** Die App erkennt jetzt auch „VPN aktiv, aber kein Internet“ (alle paar Sekunden wird der Server geprüft; zwei Fehlversuche in Folge = offline; zusätzlich der Browser-Status). Im Profil-Menü und auf der Seite „Downloads und Speicher“ gibt es außerdem einen **Offline-Modus-Schalter**, der alle Serveranfragen von Hand pausiert. Oben erscheint ein kleines Offline-Zeichen (Antippen prüft die Verbindung)
- **Offline sieht aus wie online:** Die lokale Wiedergabe nutzt jetzt den normalen Player (gleiche Leiste, Vollansicht, Knöpfe, Anordnung, Warteschlange, Weiter/Zurück, Mitwirkende, Zufall, Wiederholen). Die eigene Offline-Leiste ist entfernt. Startseite, Bibliothek, Suche, Playlists, Alben, Lieblingssongs und Mixe zeigen offline die heruntergeladenen Inhalte im gewohnten Aussehen; „Zurück“ funktioniert überall; die Titelansicht hat wie online die scrollbare Liste (Warteschlange) darunter
- **Wiedergabe aus Playlist:** In der Vollansicht steht oben „Wiedergabe aus Playlist“ und darunter der Name – auch offline, ebenso bei Album, Lieblingssongs, Mix, Sender und Mixtape
- **Songtext:** Beim Herunterladen wird der Songtext mitgespeichert und offline angezeigt (mit Zeitmarken, falls vorhanden). Neuer Knopf „Songtext vergrößern“ in der Songtext-Karte öffnet eine **große Ansicht wie bei Spotify**: Vollbild in der Cover-Farbe, große fette Zeilen, die aktuelle Zeile hell, die anderen gedämpft, Antippen einer Zeile spult dorthin, Pause/Play unten; „Zurück“ bzw. das X schließt nur diese Ansicht
- **Mixe, Sender, Mixtapes und Autoplay bleiben bei einer Stilrichtung:** Jellyfins Sofortmix nimmt zufällige Titel mit irgendeinem Genre des Ausgangstitels – ist das Genre grob (z. B. „Christlich“), landet alles im selben Mix. Jetzt bewertet das Plugin die Ähnlichkeit pro Titel: seltene Genres zählen mehr als häufige, dazu kommen gleiche Künstler/Alben, Künstler, die in deinen Playlists oder in einer Hörsitzung zusammen vorkommen, die Playlists selbst und das Erscheinungsjahr. Zu unähnliche Titel kommen nicht in den Mix; je Künstler gibt es eine Obergrenze. Unter jedem Mix steht die Stilrichtung und die Künstler. Kachel, Mix-Seite und Abspielen zeigen dieselbe Liste. Ist die Bibliothek sehr klein oder die Berechnung schlägt fehl, gilt weiter Jellyfins Sofortmix
- **Ladeanzeige wie bei Spotify:** In „Musik“ erscheint statt des mittigen Jellyfin-Kreisels ein dünner grüner Ring (eigene Ladeflächen) bzw. Jellyfins Kreisel in derselben Farbe und Stärke; auf allen anderen Seiten bleibt alles wie gewohnt

## 1.2.1.0
- **Vollansicht ausgerichtet:** Das Zufall-Symbol beginnt jetzt genau am Anfang der Fortschrittsleiste, das Wiederholen-Symbol endet genau am Ende der Leiste (das sichtbare Symbol zählt, nicht der unsichtbare Tippbereich darum). In der Fußzeile liegen Equalizer, Geschwindigkeit und Teilen jetzt exakt mittig im Bildschirm (bzw. in der Player-Spalte am Computer); Geräte-Symbol links und Warteschlange rechts schließen ebenfalls bündig mit der Leiste ab. Läuft die Musik auf einem anderen Gerät, steht „Auf <Gerät>“ in grün als eigene Zeile unter der Fußzeile, damit die Mitte frei bleibt

## 1.2.0.0
- **Downloads für Musik auf dem Gerät:** Playlists, Alben, Lieblingssongs und Mixe haben einen Download-Knopf (Kreis mit Pfeil; während des Ladens mit Zähler, grün gefüllt, wenn alles geladen ist; erneutes Tippen bricht ab bzw. entfernt nach Rückfrage). Einzelne Titel lädt man über das Titelmenü; geladene Titel zeigen ein grünes Symbol. Die Dateien werden im Browser-Speicher des Geräts abgelegt (IndexedDB, mit Titelbild), zwei Titel gleichzeitig. Wurde ein Download abgebrochen oder ist ein Titel fehlgeschlagen, bietet der Knopf „Download fortsetzen“. Ändert sich eine geladene Playlist, zieht sie nach (neue Titel dazu, entfernte weg). Ist der Speicher voll, endet der Auftrag mit einer klaren Meldung. Kann das Gerät das Original-Format nicht abspielen, wird automatisch MP3 geladen
- **Menü „Downloads und Speicher“:** Neuer Eintrag im Profil-Menü mit eigener Seite: belegter Platz der Downloads, Balken mit Downloads / Sonstigem / Frei (Schätzung des Browsers), laufende Downloads mit Abbrechen, geladene Listen und Einzeltitel (antippen öffnet die Liste, Papierkorb löscht), „Alle Downloads löschen“, Qualität (Original oder platzsparend: MP3 mit 192 kbit/s) und „Dauerhaft speichern“ (Browser soll die Downloads nicht von selbst löschen)
- **Vom Gerät abspielen, direkt in der Jellyfin-Oberfläche (keine zusätzliche App):** Auf der Downloads-Seite (Alle abspielen, Zufall, Abspielen-Knopf je Liste und Titel) und im Menü einer vollständig geladenen Liste. Eigene Leiste (Handy: über der Navigation, Computer: unten statt der Player-Leiste) mit Zurück, Pause, Weiter, Spulen und Vollansicht mit Zufall und Wiederholen (aus / alle / ein Titel). Titel und Cover erscheinen auch auf dem Sperrbildschirm, dessen Tasten Pause, Weiter und Zurück steuern. Startet eine Serverwiedergabe (hier oder von einem anderen Gerät), endet die lokale; startet die lokale, wird die Serverwiedergabe dieses Geräts pausiert. Ist das Gerät offline, spielt der normale Abspielknopf bzw. das Antippen eines Titels die geladenen Titel vom Gerät (fehlt alles, kommt ein Hinweis)
- Die lokale Wiedergabe wird vom Selbstheilungs-Neuladen der Seite nie unterbrochen
- Grenze: Die Jellyfin-Seite selbst startet ohne Verbindung zum Server nicht (Jellyfins Web-Oberfläche hat keinen Offline-Cache); das zu ändern wäre ein zu tiefer Eingriff in Jellyfin. Vom Gerät abgespielt wird, solange die Seite geladen ist

## 1.1.2.0
- **Keine Bildlaufleiste mehr:** In der Spotify-Ansicht (Seiten, Listen, Menüs, Vollansicht, Seitenleiste) und auf der Seite dahinter ist die Leiste am rechten Rand ausgeblendet; gescrollt wird weiter mit Mausrad, Touchpad, Finger und Tastatur. Der Platz, den sie belegte, gehört jetzt dem Inhalt
- **Steuerreihe sauber zentriert:** Auf dem Computer haben Cover, Titel, Fortschrittsleiste, die Reihe Zufall / Zurück / Wiedergabe / Weiter / Wiederholen und die Knöpfe darunter dieselbe Breite und Mitte; der große Wiedergabeknopf sitzt genau unter der Mitte des Covers. Auf Handy und Tablet war er schon mittig und bleibt es
- **Hover-Effekt bleibt nicht mehr hängen:** Der Hintergrund beim Darüberfahren gilt nur noch für Geräte mit Maus. Auf dem Handy erscheint er nur kurz, solange man den Knopf drückt, und ist nach dem Antippen (z. B. Zufallswiedergabe) sofort wieder weg
- **Mixe, Sender und Mixtapes öffnen zuerst die Titelliste:** Antippen von „Mix 1“ (ebenso Sender und Mixtapes) zeigt eine eigene Seite mit Cover, Kennzeichnung, Dauer, Zahl der Titel und allen Liedern; erst „Wiedergabe“ oder ein Titel startet die Musik. Der grüne Knopf auf der Kachel spielt weiterhin direkt. Die Seite lässt sich auch über die Adresse öffnen (Neuladen, Lesezeichen)
- **Wiedergabeknopf zeigt Pause:** Läuft die Playlist, das Album, der Mix, der Sender oder das Mixtape, zeigt der große grüne Knopf (und der Kachelknopf) das Pause-Symbol und pausiert bzw. setzt fort. Das Symbol wechselt sofort beim Druck, ohne auf die Antwort des Servers zu warten; schlägt der Start fehl, springt es zurück. Alben, Mixe, Sender und Mixtapes werden jetzt ebenfalls als laufende Liste erkannt (grüner Titel auf der Kachel)

## 1.1.1.0
- **Equalizer:** Neuer Knopf in der Titelseite (Balken-Symbol, grün, wenn aktiv) und Eintrag im Menü. 10 Bänder von 31 Hz bis 16 kHz (±12 dB) und Voreinstellungen **Flach, Musik, Predigt, Hörbuch, Bass, Höhen**; „Predigt“ und „Hörbuch“ schalten den De-Esser ein, „Predigt“ zusätzlich die Rauschunterdrückung. Beides lässt sich auch einzeln ein- und ausschalten. Die Berechnung läuft im Browser (Web Audio, bei Rauschunterdrückung und De-Esser ein AudioWorklet, ersatzweise ein ScriptProcessor), nicht auf dem Server. Änderungen sind direkt nach dem Loslassen eines Reglers (bzw. nach dem Antippen eines Schalters oder einer Voreinstellung) hörbar; **Übernehmen** speichert sie, **Abbrechen** oder Esc stellt den gespeicherten Zustand wieder her, **Zurücksetzen** stellt Flach und alles aus ein (bis zum Übernehmen noch abbrechbar). Eine automatische Vorverstärkung gleicht Anhebungen aus, damit nichts übersteuert. Bei „Flach“ ohne Schalter ist die Kette komplett umgangen, und ohne gespeicherte Einstellung wird das Audio-Element gar nicht angefasst. Hat Jellyfin die Audio-Verbindung (Lautheitsangleichung) schon angelegt, wird sie weiterverwendet. Auf iPhone und iPad ist der Equalizer im Browser abgeschaltet: Jellyfin meidet dort Web Audio selbst, weil es Wiedergabetempo und Tonhöhe stört
- **Wiederholen-Symbol (ein Titel):** Die Schleife war nur 10 Einheiten hoch, die „1“ stieß an die Linie und wirkte im Hochformat gequetscht. Neue, höhere Schleife mit gut lesbarer „1“ in der Mitte
- **Swiftfin und andere Videoclients:** Swiftfin kann die Oberfläche nicht anzeigen (native App) und unterstützt laut eigener Dokumentation weder Musik noch Playlists. Neu: Geräte, die dem Server melden, keine Musik abspielen zu können (PlayableMediaTypes ohne „Audio“), erscheinen nicht mehr in der Geräteauswahl und werden nicht automatisch übernommen; ein dort laufender Film erscheint nicht im Musik-Player. Apple-TV-Geräte (tvOS) bekommen das Fernseher-Symbol

## 1.0.10.0
- **Autoplay wie in Jellyfin/Spotify:** Sobald der letzte Titel der Warteschlange läuft und nichts mehr folgt, hängt das Plugin passende Titel an (Jellyfin-Sofortmix zum laufenden Titel), sodass die Musik weiterläuft. Die Warteschlange zeigt sie unter dem Trenner „Empfohlen – Autoplay“. Es wird nichts angehängt bei „Wiederholen“, mitten in der Warteschlange oder wenn Autoplay aus ist; nichts wird doppelt angehängt. Ein-/ausschalten im Menü (Autoplay). Voraussetzung: Das Plugin läuft in einem geöffneten Browser, der die Wiedergabe beobachtet
- **Neue Startseite wie bei Spotify:** „Zuletzt gespielt“ (Wieder reinhören) steht jetzt oben, darunter **Für heute empfohlen**, **Für <Benutzername>** (persönliche Mixe), **Empfohlene Sender** (Radio zu Künstlern, die du magst), **Deine Top-Mixtapes** (zu deinen meistgehörten Künstlern), **Alben mit Songs, die dir gefallen**, danach deine Playlists und geteilte Playlists. Die Empfehlungen entstehen aus deinen zuletzt gehörten Titeln und Lieblingssongs über Jellyfins Sofortmix und bleiben 20 Minuten gleich, damit die Reihen nicht ständig wechseln; fehlen Daten, entfällt die jeweilige Reihe
- **Grüner Fortschrittsbalken wie bei Spotify:** Fortschritt, Lautstärke und Mini-Leiste sind grün gefüllt (Chrome/Safari und Firefox); Jellyfins eigene Leiste wird, soweit möglich, ebenfalls grün eingefärbt

## 1.0.9.0
- **Weiter/Zurück schließt die Liedansicht nicht mehr:** Beim Titelwechsel meldet der Server kurz „es läuft nichts“. Die Vollansicht deutete das als Ende der Wiedergabe, schloss sich und zeigte darunter wieder das Album. Jetzt bleibt die Ansicht stehen; ein echtes Ende wird erst nach einigen Sekunden erkannt
- **Titelwechsel mit Gleiten:** Beim Weiter gleitet der neue Titel (Cover und Text) von rechts herein, der alte nach links hinaus; bei Zurück umgekehrt. Gilt für die Vollansicht und die Mini-Leiste, auch wenn der Wechsel von außen kommt (Medientasten, anderes Gerät, Liedende). Bei eingestellter „Bewegung reduzieren“ entfällt die Animation
- **Wischen:** In der Vollansicht über das Cover und unten über die Mini-Leiste lässt sich nach links wischen (nächster Titel) und nach rechts (vorheriger Titel; nach mehr als 3 Sekunden springt es wie bei Spotify zuerst an den Anfang des Titels). Cover und Text folgen dem Finger; ein zu kurzer Wisch springt zurück, senkrechtes Scrollen bleibt unverändert, Tippen öffnet weiterhin die Vollansicht

## 1.0.8.0
- **Kein blaues Viereck mehr um Knöpfe:** Die Tipp-Markierung des Handy-Browsers und der Fokusrahmen nach einem Klick sind in der Spotify-Ansicht (Player, Menüs, Vollansicht, Meldungen) abgeschaltet. Nur wer die Tab-Taste benutzt, sieht weiterhin einen dezenten weißen Rahmen
- **Lieblingssongs behalten ihre Reihenfolge:** Die Liste war nach „zuletzt gespielt“ sortiert und änderte sich dadurch mit jedem gespielten Titel – auf Handy und Computer sah sie darum verschieden aus. Jetzt gilt eine feste Reihenfolge (zuletzt zur Bibliothek hinzugefügte Titel zuerst, dann nach Namen); dieselbe Reihenfolge nutzt die Erkennung der laufenden Playlist

## 1.0.7.0
- **Grün markiert jetzt die richtige Playlist:** Die Erkennung der laufenden Playlist ist deutlich strenger. Vorher konnte bei Lieblingssongs eine andere Playlist grün werden, wenn sie dieselben Titel enthielt (die erste passende gewann). Jetzt gilt: Auf dem eigenen Gerät steht fest, was gestartet wurde. Auf anderen Geräten zählt nur eine eindeutige Übereinstimmung (gleiche Reihenfolge schlägt gleiche Titel); ist es nicht eindeutig, wird lieber nichts markiert als das Falsche. Ein einzelner Titel in der Warteschlange markiert keine Playlist mehr, und eine geänderte Mitte der Warteschlange wird erkannt (vorher blieb die alte Markierung stehen)
- **„Alle Bibliotheken“ zuverlässiger (Firefox):** Der Seitenwechsel zur Jellyfin-Startseite wird nicht mehr mitten im Verlaufs-Ereignis des Browsers ausgelöst (dort konnte ihn Firefox verschlucken) und danach geprüft: Kam er nicht an, wird er wiederholt; blieb die Spotify-Ansicht stehen, wird sie zwangsweise ausgeblendet; blieb die Seite leer, wird einmal neu geladen (nie, solange hier Musik läuft). Gilt auch für „Jellyfin-Startseite“ im Menü

## 1.0.6.0
- **Geräteübergreifend wie Spotify:** Spielt dein Handy (oder ein anderes Gerät mit demselben Benutzer) Musik und hier läuft nichts, zeigt der Browser automatisch den laufenden Titel mit „Auf <Gerät>“ und steuert ihn (Pause, Weiter, Spulen, Lautstärke). Umgekehrt sieht das Handy, was im Browser läuft. Startest du hier etwas Neues, läuft es auf diesem Gerät und das beobachtete Gerät wird gestoppt; „Dieses Gerät“ in der Geräteauswahl schaltet das automatische Mitverfolgen bis zum Neuladen ab
- **Laufende Playlist ist grün:** Lieblingssongs und selbst erstellte Playlists werden in der Bibliothek/Seitenleiste, auf der Startseite (Schnellzugriff und Kacheln) grün markiert, mit Lautsprecher-Symbol, solange sie laufen oder pausiert sind – auch wenn sie auf einem anderen Gerät laufen (erkannt über die Warteschlange). Der große Abspielknopf der Playlist zeigt dann „Pause“
- **Zurück zu Jellyfin:** Neuer Knopf „Alle Bibliotheken“ links über der Bibliothek (Computer) führt zur normalen Jellyfin-Startseite mit Filmen, Serien und allen anderen Bibliotheken (am Handy weiterhin im Profilmenü: „Jellyfin-Startseite“)

## 1.0.5.0
- **Gerätewechsel zuverlässig:** Wählst du ein anderes Gerät (z. B. „Firefox“ oder „Mein Gerät“), wird die Wiedergabe dort gestartet und erst danach auf dem bisherigen Gerät gestoppt. Startet das Zielgerät nicht, wird der Befehl einmal wiederholt; reagiert es weiterhin nicht, läuft die Musik einfach auf dem bisherigen Gerät weiter und es gibt eine Meldung.
- **Der Player verschwindet nie mehr:** Ist ein anderes Gerät gewählt, das gerade nichts spielt, bleibt die Player-Leiste mit „Nichts wird abgespielt – verbunden mit …“ sichtbar, die Geräte-Auswahl ist immer erreichbar (vorher verschwand die gesamte Leiste und kam nicht wieder)
- **Selbstheilung der Ansicht:** Ein Wächter prüft alle 2 Sekunden und nach jeder Rückkehr in den Tab, ob die Spotify-Ansicht zur Seite passt (sichtbar, mit Inhalt, Player läuft) und baut sie sonst neu auf. Scheitert das Erkennen der Seite durch einen kurzen Server-/Netzwerkfehler, wird mehrfach neu versucht, statt die Ansicht dauerhaft zu verlieren
- Hängende Abfragen des Players werden nach 15 Sekunden überholt und können die Anzeige nicht mehr einfrieren
- Geräteliste: Zeile zeigt „Wird übertragen …“, Mehrfachklicks werden abgefangen

## 1.0.4.0
- Vollansicht am Computer nimmt jetzt die Farbe des Covers an (vorher blieb sie grau, weil die Farbe nur aus der am Computer ausgeblendeten Mini-Leiste berechnet wurde); gilt auch für die rechte Spalte
- Vollansicht am Handy: Der Farbverlauf liegt oben und scrollt mit; beim Herunterscrollen wird alles dunkel statt überall gleich gefärbt zu bleiben. Dabei behoben: Der Verlauf hatte dort eine harte Kante am unteren Ende

## 1.0.3.0
- **Schnell und stabil:** Läuft die Musik in diesem Browser, wirken Pause/Play, Spulen, Lautstärke und „Zurück zum Anfang“ sofort direkt auf das Audio, ohne Umweg über den Server. Pause oder Play von außen (Medientasten, Bluetooth, Jellyfin selbst) erscheint in der Anzeige ohne Verzögerung.
- Läuft die Musik auf einem anderen Gerät, zeigt die Anzeige die Änderung sofort, der Befehl wird bei ausbleibender Reaktion einmal wiederholt, danach gibt es einen Hinweis statt stillem Hängenbleiben.
- **Browser-/Computer-Ansicht deutlich überarbeitet (nach Spotify-Vorbild):** Farbverlauf überall weich nach Schwarz ohne Kante (Seiten, rechte Spalte, Vollansicht), Farbe reicht über die ganze Breite
- Vollansicht am Computer mit zwei Spalten: Cover und Steuerung links, Songtext, Warteschlange und Künstler rechts
- Warteschlange und Songtext öffnen sich am Computer in der rechten Spalte; in schmaleren Fenstern (unter 1180 px) als Vollbild-Ebene
- Grüner Abspielknopf beim Darüberfahren über Kacheln, Typ-Zeile („Playlist“, „Album“ …) über dem Titel, Spotify-Reihenfolge der Knöpfe
- Das Einschleusen der Seite schreibt Fehler jetzt ins Jellyfin-Protokoll
- Im Update-Manifest steht der Änderungstext der jeweiligen Version (aus dieser Datei)

## 1.0.2.0
- Jellyfin-Suche (Lupe neben dem Profilbild) bleibt die normale Jellyfin-Seite: Das Plugin hat dort vorher fälschlich den schwarzen Musik-Look samt Schrift angewendet, weil der Suchlink die ID der Musikbibliothek enthält. Musik-Look gilt jetzt nur auf der Musik-Startseite und auf Playlist-, Album- und Künstlerseiten.
- Wird in der Suche ein Titel gewählt, öffnet sich dessen Album in der Spotify-Ansicht, der Titel ist markiert

## 1.0.1.0
Ab jetzt zählt die Version ab 1.0.1 weiter (der Workflow verlangt vier Zahlen, daher 1.0.1.0).
- **Computer-Ansicht:** Bibliothek links, Inhalt mit Titeltabelle in der Mitte, laufender Titel rechts, Player-Leiste unten (wie Spotify Desktop)
- Wiederholen- und Zufall-Symbole wie bei Spotify (mit Punkt bei aktiv, Wiederholen-Eins)
- Seiten haben immer einen Farbverlauf aus der Cover-Farbe nach Schwarz statt einer einfarbigen Fläche
- Herz speichert zuverlässig in „Lieblingssongs“ (neue und alte Jellyfin-Route, Fehlermeldung statt stillem Fehlschlag)
- Lieblingssongs wie bei Spotify: Herz pro Zeile, Titel hinzufügen, Leer-Zustand, Eintrag in „Zu Playlist hinzufügen“
- Hörbücher: Ordnerstruktur der Bibliothek wird durchsucht (Autor → Buch → Kapitel), Genre „Hörbuch“ als Ausweichlösung, Diagnose-Hinweis bei leerer Liste
- Zurück-Taste schließt Titelansicht, Warteschlange und Dialoge und bleibt in der App
- „Link kopieren“ erzeugt eine Web-Adresse; Hinweis, wenn WhatsApp sie nicht anklickbar machen kann; neue Einstellung „Link-Adresse für Teilen“
- Neue Playlist mit Titel zeigt sofort ein Cover aus den enthaltenen Titeln
- Eingabedialoge (z. B. „Neue Playlist“) liegen oben und bleiben über der Tastatur sichtbar
- Schneller: Playlists/Bibliotheken werden im Browser gemerkt und sofort gezeigt; Abdeckung gegen das Aufblitzen des alten Layouts
- Profilmenü: Dashboard und Einstellungen

## 0.1.0.7
- Knopf „Spotify-Ansicht“ liegt jetzt über Jellyfins Wiedergabeleiste und war dort vorher verdeckt
- „Klassische Ansicht“ gilt nur noch bis zum Neustart der App bzw. des Tabs; ein früher gespeicherter Wert wird beim Start entfernt

## 0.1.0.6
- „Hörbücher“ korrekt benannt (Standard-Stichwörter angepasst, alter Wert wird migriert)
- Suche: ohne Begriff alle Titel in einer alphabetischen Liste
- Jellyfins Standard-Leiste (Alben/Play/Filter/Zähler) und A–Z-Leiste in Musikbibliotheken ausgeblendet, kein Überlappen mehr mit dem Mini-Player
- „Neue Playlist“ und andere Dialoge bleiben über der Handytastatur sichtbar
- Titelseite wie bei Spotify: Cover-Farben, „+“ zu Playlist, Songtext (.lrc/.txt, gleicher Name), Warteschlange, Künstler, Credits, kompakte Leiste beim Scrollen
- Playlists und Alben: Cover statt Nummern
- Künstlerseite mit schwarzem Hintergrund
- Gerätewechsel zwischen eigenen Jellyfin-Sitzungen
- Sammelordner (z. B. „Cinderella“): Gruppierung nach Album-Tag mit Hinweis
- Eingangsordner-Sortierer verschiebt Songtext-Dateien mit

## 0.1.0.4
- Spotify-Ansicht nur für Musikbibliotheken (Start, Playlist, Album)
- Chips Alle / Musik / Podcasts / Hörbücher
- Playlist-Seite mit 2x2-Cover oder eigenem Bild, Beschreibung, Besitzer, Laufzeit
- Drei-Punkte-Menüs für Playlist und Titel, Playlist bearbeiten, löschen (ohne Titel)
- ZIP-Download, Teilen, Jam, Mini- und Vollbild-Player
- Hintergrund-Fix (kein Theme-Bild mehr sichtbar)

## 0.1.0.3
- Erste lauffähige Version (Plugin-Repository, Build per Tag)
