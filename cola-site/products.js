// ─────────────────────────────────────────────────────────────
//  VELA Cola – Inhalte, Sorten und Preise (fiktive Demo-Marke).
//  Farben, Texte und Preise hier anpassen; Etiketten werden
//  automatisch daraus gezeichnet.
// ─────────────────────────────────────────────────────────────

export const BRAND = 'VELA';
export const CURRENCY = 'EUR';
export const FREE_SHIPPING_FROM = 39;
export const DEPOSIT = 0.15; // Mehrwegpfand pro Flasche

export const FLAVORS = [
  {
    id: 'classic', name: 'Classic', tagline: 'Das Original. Seit 2019.',
    copy: 'Rohrzucker, Kolanuss, ein Hauch Zimt und Zitrus. Kräftig, rund und eiskalt am besten.',
    label: '#d7192d', labelText: '#ffffff', cap: '#c3121f', accent: '#ff2d45', light: '#ff8a95',
    liquid: '#2a0b04',
  },
  {
    id: 'zero', name: 'Zero', tagline: 'Voller Geschmack. Null Zucker.',
    copy: 'Gleiches Rezept, gesüßt mit Stevia und Erythrit. 0 kcal, 100 % Cola.',
    label: '#121212', labelText: '#ff3344', cap: '#1b1b1b', accent: '#ff3344', light: '#ff8a95',
    liquid: '#240a04',
  },
  {
    id: 'cherry', name: 'Cherry', tagline: 'Dunkle Kirsche. Heller Zisch.',
    copy: 'Saure Schattenmorellen treffen auf unser Cola-Rezept. Fruchtig, ohne klebrig zu sein.',
    label: '#7d1030', labelText: '#ffd6e0', cap: '#5e0b24', accent: '#ff4d7d', light: '#ff9fb8',
    liquid: '#330611',
  },
  {
    id: 'vanilla', name: 'Vanilla', tagline: 'Bourbon-Vanille. Weich im Abgang.',
    copy: 'Echte Vanilleschote aus Madagaskar macht die Cola cremig und rund.',
    label: '#efe0bf', labelText: '#5a2a12', cap: '#b98a45', accent: '#e7b766', light: '#f6d9a3',
    liquid: '#2e1006',
  },
];

export const PRODUCTS = [
  { id: 'classic-033', flavor: 'classic', size: '0,33 l Glas', price: 1.49, badge: 'Bestseller' },
  { id: 'zero-033',    flavor: 'zero',    size: '0,33 l Glas', price: 1.49 },
  { id: 'cherry-033',  flavor: 'cherry',  size: '0,33 l Glas', price: 1.69, badge: 'Neu' },
  { id: 'vanilla-033', flavor: 'vanilla', size: '0,33 l Glas', price: 1.69 },
];

export const BUNDLES = [
  { id: 'six',    name: '6er Träger',  bottles: 6,  price: 8.49,  note: 'Eine Sorte oder gemischt' },
  { id: 'twelve', name: '12er Pack',   bottles: 12, price: 15.99, note: 'Alle Sorten kombinierbar', featured: true },
  { id: 'crate',  name: '24er Kiste',  bottles: 24, price: 27.99, note: 'Holzkiste & Flaschenöffner gratis' },
];

// Nährwerte pro 100 ml (Classic / Zero)
export const NUTRITION = [
  ['Energie', '42 kcal', '0,3 kcal'],
  ['Fett', '0 g', '0 g'],
  ['Kohlenhydrate', '10,4 g', '0 g'],
  ['davon Zucker', '10,4 g', '0 g'],
  ['Eiweiß', '0 g', '0 g'],
  ['Salz', '0,01 g', '0,02 g'],
  ['Koffein', '10 mg', '10 mg'],
];

export const flavorById = (id) => FLAVORS.find((f) => f.id === id);
export const formatPrice = (v) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: CURRENCY }).format(v);
