// Pablo-Ice-Cold-Variante der Seite (wird von pablo.html per Importmap statt products.js geladen).
// Bilder: assets/products/pablo-*.webp (vom Nutzer bereitgestellt).

export const BRAND = 'PABLO';
export const CURRENCY = 'EUR';
export const FREE_SHIPPING_FROM = 39;
export const MG_UNIT = 'mg/g';

export const FLAVORS = [
  {
    id: 'ice-cold',
    name: 'Ice Cold',
    tagline: 'Danger Strong. Eiskalt.',
    copy: 'Das Original mit kräftiger Minze und extremem Kälte-Kick. Nur für erfahrene Nutzer.',
    base: '#8a6a2e', light: '#e0bd72', dark: '#1b140a', accent: '#e3232a',
    lidImage: 'assets/products/pablo-ice-cold.webp', level: 4,
  },
  {
    id: 'mini-ice-cold',
    name: 'Mini Ice Cold',
    tagline: 'Kleiner Pouch. Gleiche Kälte.',
    copy: 'Das Mini-Format: diskret unter der Lippe, mit dem typischen Ice-Cold-Geschmack.',
    base: '#161616', light: '#ff5a5f', dark: '#050505', accent: '#e3232a',
    lidImage: 'assets/products/pablo-mini-ice-cold.webp', level: 3,
  },
];

// mg Nikotin pro Gramm
export const STRENGTHS = [
  { level: 3, label: 'Mini', mg: 30 },
  { level: 4, label: 'Danger Strong', mg: 50 },
];

export const PRODUCTS = [
  { id: 'pablo-ice-cold', flavor: 'ice-cold', strength: 4, price: 5.99, image: 'assets/products/pablo-ice-cold.webp', badge: 'Bestseller' },
  { id: 'pablo-mini-ice-cold', flavor: 'mini-ice-cold', strength: 3, price: 5.49, image: 'assets/products/pablo-mini-ice-cold.webp', badge: 'Mini' },
];

export const BUNDLES = [
  { id: 'single', name: 'Einzeldose', cans: 1,  price: 5.99,   note: 'Zum Ausprobieren' },
  { id: 'pack10', name: '10er Stange', cans: 10, price: 54.90,  note: 'Ice Cold & Mini kombinierbar', featured: true },
  { id: 'box30',  name: '30er Box',    cans: 30, price: 149.00, note: 'Gratis Versand' },
];

export const flavorById = (id) => FLAVORS.find((f) => f.id === id);
export const strengthByLevel = (l) => STRENGTHS.find((s) => s.level === l);
export const formatPrice = (v) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: CURRENCY }).format(v);
