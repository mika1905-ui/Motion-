// ─────────────────────────────────────────────────────────────
//  Produktdaten – hier Preise, Sorten und Bilder anpassen.
//
//  ORIGINALBILDER: Lege deine eigenen Produktfotos in
//  assets/products/ ab und trage den Pfad bei `image` ein,
//  z. B. image: 'assets/products/ice-mint.png'.
//  Ist `image` leer (null), rendert die Seite automatisch
//  eine 3D-Dose in der Sortenfarbe.
// ─────────────────────────────────────────────────────────────

export const BRAND = 'KRYO';
export const CURRENCY = 'EUR';
export const FREE_SHIPPING_FROM = 39;

export const FLAVORS = [
  {
    id: 'ice-mint',
    name: 'Ice Mint',
    tagline: 'Klare Minze. Arktische Frische.',
    copy: 'Pfefferminze trifft Eukalyptus – ein sauberer, kühler Kick, der lange anhält.',
    base: '#1b62d6', light: '#7cc4ff', dark: '#0a2a66', accent: '#4aa8ff',
  },
  {
    id: 'frozen-melon',
    name: 'Frozen Melon',
    tagline: 'Saftig süß. Eiskalt serviert.',
    copy: 'Reife Wassermelone mit einem frostigen Finish. Sommer in einer Dose.',
    base: '#d92d63', light: '#ff9cbc', dark: '#5c0b26', accent: '#ff4f86',
  },
  {
    id: 'blueberry-frost',
    name: 'Blueberry Frost',
    tagline: 'Dunkle Beere. Heller Frost.',
    copy: 'Waldheidelbeere, leicht herb, mit einem eisigen Menthol-Nachklang.',
    base: '#5a3ad6', light: '#b39dff', dark: '#1f1060', accent: '#8f73ff',
  },
  {
    id: 'lime-shock',
    name: 'Lime Shock',
    tagline: 'Spritzig sauer. Elektrisch kühl.',
    copy: 'Frische Limettenzeste mit einem Hauch Ingwer – für alle, die es knackig mögen.',
    base: '#159c55', light: '#8ff0b0', dark: '#06381f', accent: '#2fd47a',
  },
];

// Stärke: level 1–4 (Punkte auf der Dose), mg Nikotin pro Pouch
export const STRENGTHS = [
  { level: 1, label: 'Light',   mg: 4 },
  { level: 2, label: 'Regular', mg: 8 },
  { level: 3, label: 'Strong',  mg: 12 },
  { level: 4, label: 'Extra',   mg: 16 },
];

export const PRODUCTS = [
  { id: 'ice-mint-8',         flavor: 'ice-mint',        strength: 2, price: 5.49, image: null, badge: 'Bestseller' },
  { id: 'ice-mint-16',        flavor: 'ice-mint',        strength: 4, price: 5.99, image: null },
  { id: 'frozen-melon-8',     flavor: 'frozen-melon',    strength: 2, price: 5.49, image: null, badge: 'Neu' },
  { id: 'frozen-melon-12',    flavor: 'frozen-melon',    strength: 3, price: 5.79, image: null },
  { id: 'blueberry-frost-4',  flavor: 'blueberry-frost', strength: 1, price: 5.29, image: null },
  { id: 'blueberry-frost-12', flavor: 'blueberry-frost', strength: 3, price: 5.79, image: null },
  { id: 'lime-shock-8',       flavor: 'lime-shock',      strength: 2, price: 5.49, image: null },
  { id: 'lime-shock-16',      flavor: 'lime-shock',      strength: 4, price: 5.99, image: null, badge: 'Limited' },
];

// Bundles für die Preis-Sektion
export const BUNDLES = [
  { id: 'single', name: 'Einzeldose', cans: 1,  price: 5.49,   note: 'Zum Ausprobieren' },
  { id: 'pack10', name: '10er Stange', cans: 10, price: 49.90,  note: 'Mix aus allen Sorten wählbar', featured: true },
  { id: 'box30',  name: '30er Box',    cans: 30, price: 129.00, note: 'Gratis Versand & Metall-Dose' },
];

export const flavorById = (id) => FLAVORS.find((f) => f.id === id);
export const strengthByLevel = (l) => STRENGTHS.find((s) => s.level === l);
export const formatPrice = (v) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: CURRENCY }).format(v);
