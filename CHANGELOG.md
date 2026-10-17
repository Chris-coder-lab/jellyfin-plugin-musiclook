# Änderungen

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
