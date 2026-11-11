# Pöff – 3D-Motion-Produktseite

Apple-artige Landingpage für **Pöff**, den Beutel zum Reinpupsen und Reinkotzen.
Ein in Three.js modellierter Stoffbeutel (Drehprofil mit Falten, Kordel, Stoffstruktur) reagiert auf das Scrollen:

| Abschnitt | Was passiert |
|---|---|
| Hero | Beutel schwebt, dreht sich, Titel blendet aus |
| Puff-Modus | Duftwolken werden in den Beutel gesaugt, er bläht sich auf |
| Splash-Modus | Tropfen fallen in die Öffnung, der Beutel wackelt |
| Technik | Explosionsansicht der drei Lagen mit mitlaufenden Beschriftungen |
| Düfte | 7 Geschmäcker – Klick färbt Beutel, Wolken und die ganze Seite um |

Danach: Highlights mit Zähl-Animation, Momente-Karussell, Preise (Air 9,99 €, Splash 14,99 €, Pro 24,99 €, Duft-Abo 4,99 €/Monat) mit 3D-Tilt-Karten und Warenkorb, Vergleichstabelle, FAQ.

## Starten

Kein Build nötig, Three.js liegt in `vendor/`. Wegen ES-Modulen über einen lokalen Server öffnen:

```bash
cd beutel
python3 -m http.server 8000   # dann http://localhost:8000
```
