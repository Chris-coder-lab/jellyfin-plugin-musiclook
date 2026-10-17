# Änderungen

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
