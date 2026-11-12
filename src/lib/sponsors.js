// Sponsored placements from local businesses. One commercial spot per page; every
// card is labeled Sponsored. Keep entries factual: name, city, what the business
// itself lists, links. No medical or price claims in Border Pulse's voice; the
// business owns its own claims, and they are shown as the business's.
// Remove an entry (or set `until`) to end a placement.

// Cities a business can sponsor, and the crossing pages that show its card.
export const CITIES = [
  {
    id: 'juarez', name: 'Ciudad Juárez', from: { en: 'El Paso', es: 'El Paso' },
    // PDN, BOTA, Ysleta, Stanton DCL, El Paso (combined).
    ports: ['240202', '240201', '240104', '240204', '240221'],
    crossings: [
      ['el-paso-paso-del-norte-pdn', 'Paso del Norte (PDN)'],
      ['el-paso-bridge-of-the-americas-bota', 'Bridge of the Americas (BOTA)'],
      ['ysleta', 'Ysleta (Zaragoza)'],
      ['el-paso-stanton-dcl', 'Stanton DCL'],
    ],
  },
  {
    id: 'tijuana', name: 'Tijuana', from: { en: 'San Diego', es: 'San Diego' },
    ports: ['250401', '250601'],
    crossings: [['san-ysidro', 'San Ysidro'], ['otay-mesa', 'Otay Mesa']],
  },
  {
    id: 'algodones', name: 'Los Algodones', from: { en: 'Yuma', es: 'Yuma' },
    ports: ['250201'],
    crossings: [['andrade', 'Andrade']],
  },
  {
    id: 'nogales', name: 'Nogales', from: { en: 'Nogales, Arizona', es: 'Nogales, Arizona' },
    ports: ['260401', '260402', '260403'],
    crossings: [
      ['nogales-deconcini', 'DeConcini'], ['nogales-mariposa', 'Mariposa'], ['nogales-morley-gate', 'Morley Gate'],
    ],
  },
  {
    id: 'progreso', name: 'Nuevo Progreso', from: { en: 'the Rio Grande Valley', es: 'el Valle del Río Grande' },
    ports: ['230901', '230902'],
    crossings: [
      ['progreso-progreso-international-bridge', 'Progreso International Bridge'],
      ['progreso-donna-international-bridge', 'Donna International Bridge'],
    ],
  },
];

export const CATEGORIES = [
  { id: 'dental', en: 'Dentist', es: 'Dentista' },
  { id: 'pharmacy', en: 'Pharmacy', es: 'Farmacia' },
  { id: 'medical', en: 'Medical clinic', es: 'Clínica médica' },
  { id: 'food', en: 'Food', es: 'Comida' },
  { id: 'auto', en: 'Auto', es: 'Autos' },
  { id: 'beauty', en: 'Salon & beauty', es: 'Salón y belleza' },
];

// One Stripe Payment Link per open spot, each limited to one completed
// purchase. Stripe deactivates a link after its sale, so a spot cannot be sold
// twice; a second buyer sees "this spot was just taken". Border Pulse reviews
// each listing before adding it below, then removes that slot from this map.
export const LISTING_PRICE_USD = 99;
export const SLOT_CHECKOUT = {
  'juarez-pharmacy': 'https://buy.stripe.com/aFa28qagb7TH6PI22X9AA04',
  'juarez-medical': 'https://buy.stripe.com/00weVc73Zei50rk8rl9AA05',
  'juarez-food': 'https://buy.stripe.com/fZudR8agbde18XQ22X9AA06',
  'juarez-auto': 'https://buy.stripe.com/cNi14m4VR5Lz8XQePJ9AA07',
  'juarez-beauty': 'https://buy.stripe.com/6oUaEW8830rf5LEdLF9AA08',
  'tijuana-dental': 'https://buy.stripe.com/14AcN4dsn2zn0rk5f99AA09',
  'tijuana-pharmacy': 'https://buy.stripe.com/6oUcN44VRgqd8XQ3719AA0a',
  'tijuana-medical': 'https://buy.stripe.com/6oUdR8coj6PD8XQcHB9AA0b',
  'tijuana-food': 'https://buy.stripe.com/eVqaEWagb8XL7TMePJ9AA0c',
  'tijuana-auto': 'https://buy.stripe.com/cNiaEWdsn5Lz3DwcHB9AA0d',
  'tijuana-beauty': 'https://buy.stripe.com/00w4gy0FB1vja1Uazt9AA0e',
  'algodones-dental': 'https://buy.stripe.com/6oU8wObkf6PD7TM5f99AA0f',
  'algodones-pharmacy': 'https://buy.stripe.com/14A6oGcojc9X1voePJ9AA0g',
  'algodones-medical': 'https://buy.stripe.com/dRmdR85ZVei5eiadLF9AA0h',
  'algodones-food': 'https://buy.stripe.com/eVqdR83RNb5Tca2fTN9AA0i',
  'algodones-auto': 'https://buy.stripe.com/6oU8wObkfc9Xde63719AA0j',
  'algodones-beauty': 'https://buy.stripe.com/fZueVc4VR6PDde6ePJ9AA0k',
  'nogales-dental': 'https://buy.stripe.com/cNi14mewr1vj0rkgXR9AA0l',
  'nogales-pharmacy': 'https://buy.stripe.com/14A28q3RN7THca25f99AA0m',
  'nogales-medical': 'https://buy.stripe.com/8x2bJ0gEz6PD5LE8rl9AA0n',
  'nogales-food': 'https://buy.stripe.com/6oU5kCgEz0rfca2ePJ9AA0o',
  'nogales-auto': 'https://buy.stripe.com/aFa7sKagbde1fme7nh9AA0p',
  'nogales-beauty': 'https://buy.stripe.com/5kQ5kCcoj8XL1vo8rl9AA0q',
  'progreso-dental': 'https://buy.stripe.com/dRmeVc9c7a1P4HAfTN9AA0r',
  'progreso-pharmacy': 'https://buy.stripe.com/7sY4gy9c7a1P5LE22X9AA0s',
  'progreso-medical': 'https://buy.stripe.com/dRm3cu3RN0rffme6jd9AA0t',
  'progreso-food': 'https://buy.stripe.com/4gMeVc4VR1vj0rkdLF9AA0u',
  'progreso-auto': 'https://buy.stripe.com/14A00i883gqdfmecHB9AA0v',
  'progreso-beauty': 'https://buy.stripe.com/4gM7sK73Za1P8XQ4b59AA0w',
};
export const checkoutFor = slot => SLOT_CHECKOUT[slot] || null;

export const SPONSORS = [
  {
    id: 'constandse-dental',
    name: 'Dr. J Constandse',
    city: 'juarez',
    category: 'dental',
    // What the clinic's own site lists, in its order. Shown as "listed by the clinic".
    services: {
      en: ['Dental implants', 'Veneers and smile design', 'Crowns', 'Full oral rehabilitation'],
      es: ['Implantes dentales', 'Carillas y diseño de sonrisa', 'Coronas', 'Rehabilitación oral completa'],
    },
    // Optional offer from the business, shown with its end date and hidden after it.
    offer: {
      en: '25% off treatments through Nov 30, per the clinic.',
      es: '25% de descuento en tratamientos hasta el 30 de nov., según la clínica.',
      until: '2026-11-30',
    },
    url: 'https://constandse-dental.vercel.app/',
    whatsapp: '19153007751',
    // Prefilled so the business sees where the patient came from.
    whatsappText: {
      en: 'Hi, I found your clinic on Border Pulse and would like to book an appointment.',
      es: 'Hola, encontré su consultorio en Border Pulse y quiero agendar una cita.',
    },
    guides: [
      'bringing-prescription-medication-back-from-mexico', 'traer-medicamentos-con-receta-de-mexico',
      'dentist-in-juarez-from-el-paso-new-mexico', 'dentista-en-juarez-desde-el-paso-nuevo-mexico',
    ],
    since: '2026-11-10',
    until: null,
  },
];

const active = (s, today) => (!s.since || s.since <= today) && (!s.until || today <= s.until);
const todayIso = () => new Date().toISOString().slice(0, 10);
const dayNumber = today => Math.floor(Date.parse(`${today}T00:00:00Z`) / 86400000);

export function sponsorFor(cityId, categoryId, today = todayIso()) {
  return activeSponsors(today).find(s => s.city === cityId && s.category === categoryId) || null;
}

export const cityForPort = portNumber => CITIES.find(c => c.ports.includes(String(portNumber))) || null;
export const cityById = id => CITIES.find(c => c.id === id) || null;
export const categoryById = id => CATEGORIES.find(c => c.id === id) || null;

export function activeSponsors(today = todayIso()) {
  return SPONSORS.filter(s => active(s, today));
}

// A city's crossing pages hold one spot. With several sponsors in a city, the
// spot rotates by calendar day (UTC), so each gets whole days, not split views.
export function sponsorForPort(portNumber, today = todayIso()) {
  const city = CITIES.find(c => c.ports.includes(String(portNumber)));
  if (!city) return null;
  const list = activeSponsors(today).filter(s => s.city === city.id);
  if (!list.length) return null;
  return list[dayNumber(today) % list.length];
}

export function sponsorForGuide(slug, today = todayIso()) {
  return activeSponsors(today).find(s => s.guides?.includes(slug)) || null;
}

// Taken: a live sponsor holds it, or its checkout link is retired (sold, in review).
export function slotTaken(cityId, categoryId, today = todayIso()) {
  return activeSponsors(today).some(s => s.city === cityId && s.category === categoryId)
    || !checkoutFor(`${cityId}-${categoryId}`);
}

export function offerFor(sponsor, today = todayIso()) {
  const o = sponsor?.offer;
  return o && (!o.until || today <= o.until) ? o : null;
}

// Outbound link with UTM so the business can see Border Pulse in its own analytics.
export function sponsorUrl(sponsor, placement) {
  const u = new URL(sponsor.url);
  u.searchParams.set('utm_source', 'borderpulse');
  u.searchParams.set('utm_medium', 'sponsored');
  u.searchParams.set('utm_campaign', placement);
  return u.toString();
}

export function whatsappUrl(sponsor, language = 'en') {
  if (!sponsor.whatsapp) return null;
  const text = sponsor.whatsappText?.[language === 'es' ? 'es' : 'en'];
  return `https://wa.me/${sponsor.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
