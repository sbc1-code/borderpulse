// Sponsored placements from local businesses. One commercial spot per page; every
// card is labeled Sponsored. Keep entries factual: name, city, what the business
// itself lists, links. No medical or price claims in Border Pulse's voice; the
// business owns its own claims, and they are shown as the business's.
// Remove an entry (or set `until`) to end a placement.

// Cities a business can sponsor, and the crossing pages that show its card.
export const CITIES = [
  // PDN, BOTA, Ysleta, Stanton DCL, El Paso (combined).
  { id: 'juarez', name: 'Ciudad Juárez', ports: ['240202', '240201', '240104', '240204', '240221'] },
  // San Ysidro, Otay Mesa.
  { id: 'tijuana', name: 'Tijuana', ports: ['250401', '250601'] },
  // Andrade.
  { id: 'algodones', name: 'Los Algodones', ports: ['250201'] },
  // DeConcini, Mariposa, Morley Gate.
  { id: 'nogales', name: 'Nogales', ports: ['260401', '260402', '260403'] },
  // Progreso International Bridge, Donna.
  { id: 'progreso', name: 'Nuevo Progreso', ports: ['230901', '230902'] },
];

export const CATEGORIES = [
  { id: 'dental', en: 'Dentist', es: 'Dentista' },
  { id: 'pharmacy', en: 'Pharmacy', es: 'Farmacia' },
  { id: 'medical', en: 'Medical clinic', es: 'Clínica médica' },
  { id: 'food', en: 'Food', es: 'Comida' },
  { id: 'auto', en: 'Auto', es: 'Autos' },
  { id: 'beauty', en: 'Salon & beauty', es: 'Salón y belleza' },
];

// Stripe Payment Link for the self-serve listing. The buyer picks city and
// category there; Border Pulse reviews each listing before adding it below.
export const LISTING_PRICE_USD = 99;
export const CHECKOUT_URL = 'https://buy.stripe.com/dRmaEW9c7fm97TMdLF9AA03';

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

export function slotTaken(cityId, categoryId, today = todayIso()) {
  return activeSponsors(today).some(s => s.city === cityId && s.category === categoryId);
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
