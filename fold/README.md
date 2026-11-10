# iPhone Fold – interaktiver Kampagnen-Prototyp

Konzeptstudie für ein faltbares iPhone: Scroll-/Klick-gesteuertes Entfalten in 3D, holografisches OS mit Parallax,
Feature-Showcase mit X-Ray- und Explosionsansicht, Vorbestell- und AR-Dialog.

## Starten
Keine Build-Schritte, keine Abhängigkeiten aus dem Netz (GSAP liegt in `vendor/`).

```bash
cd fold
npx serve .            # oder: python3 -m http.server 8000
```
Dann `http://localhost:8000` öffnen. `index.html` funktioniert auch direkt per Doppelklick –
nur die Live-Kamera der AR-Vorschau braucht `https://` oder `localhost`.

## Ablauf
| Abschnitt | Was passiert |
|---|---|
| **Stage 1 – Hero** | Geschlossenes Gerät, Titan-Reflexe, Neon-Glow an Scharnier & Naht, Pointer-Tilt |
| **Unfold** | Scroll (oder Klick aufs Gerät / „Entfalten“) klappt die rechte Hälfte in 3D auf, Naht leuchtet auf |
| **Stage 2 – Holo-OS** | Boot-Sequenz, schwebende Widgets auf eigenen Tiefen-Ebenen (Parallax), Licht folgt dem Cursor, Widgets per **GSAP Flip** expandierbar |
| **Stage 3 – Technik** | Chips *Liquid Hinge* (X-Ray + Scharnier-Bewegung), *Seamless OLED* (Explosionsansicht), *Quantum Chip* (X-Ray-Zoom auf den Chip) |
| **CTA** | Farbwahl (färbt das Gerät live), „Jetzt vorbestellen“ (Dialog), „In AR ansehen“ (Kamera-Overlay, drehen/pinchen) |

## Struktur
```
fold/
├─ index.html        Markup: Gerät (2 Hälften, Faces, Interna), Holo-OS, Sektionen, Dialoge
├─ css/style.css     Tokens → Bühne → Gerät → Holo-OS → X-Ray/Explosion → Content → Dialoge
├─ js/app.js         Geometrie, State (Scroll S + Fokus F), Render-Loop, Timeline, Flip, Features, AR
├─ vendor/           GSAP 3.12.5 (Core, ScrollTrigger, ScrollToPlugin, Flip)
└─ assets/           Logo
```
Alles 3D läuft über CSS-3D-Transforms (GPU), animiert von einer gescrubbten GSAP-Timeline;
ein einziger `gsap.ticker` setzt pro Frame die Transforms → flüssige 60 FPS. `prefers-reduced-motion` wird respektiert.

## Hinweis
Konzept / Spec-Ad – kein offizielles Apple-Produkt; Specs und Preise sind fiktiv.
Apple, das Apple-Logo und iPhone sind Marken der Apple Inc. Vor einer öffentlichen
Verwendung (z. B. als bezahlte Werbung) die Markenrechte klären.
