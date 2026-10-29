# Barrierefreiheit

Music Look ist eine Erweiterung der Jellyfin-Web-Oberfläche. Es gelten zusätzlich die Möglichkeiten und Grenzen von Jellyfin selbst.

## Was berücksichtigt ist
- Knöpfe haben Beschriftungen für Screenreader (`aria-label`), Symbole sind nicht die einzige Information.
- Bedienung mit Tastatur: Knöpfe und Menüs sind fokussierbar; Esc schließt Dialoge.
- Animationen werden bei der Systemeinstellung „Bewegung reduzieren“ verringert.
- Kontrastreiche Darstellung auf dunklem Hintergrund; die Akzentfarbe ist einstellbar.

## Bekannte Grenzen
- Das Plugin wurde bisher nicht mit Screenreadern auf echten Geräten geprüft; es kann Lücken geben.
- Fortschrittsleisten und Schieberegler lassen sich per Tastatur bedienen, die Sprachausgabe der Werte ist nicht überall getestet.
- Cover-Farbverläufe wechseln je nach Cover; ein garantierter Mindestkontrast für alle Cover ist nicht möglich.

## Barrieren melden
Bitte ein [Issue](https://github.com/Chris-coder-lab/jellyfin-plugin-musiclook/issues/new/choose) mit der Vorlage „Fehler melden“ eröffnen und beschreiben, wo und womit (Browser, Hilfsmittel) die Bedienung scheitert.
