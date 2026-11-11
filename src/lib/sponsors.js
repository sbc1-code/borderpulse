// Sponsored placements from local businesses. One sponsor per placement; every card
// is labeled Sponsored. Keep entries factual: name, city, links. No medical or
// price claims in Border Pulse's voice; the business owns its own claims.
// Remove an entry (or set `until`) to end a placement.
export const SPONSORS = [
  {
    id: 'constandse-dental',
    name: 'Constandse Esthetic & Dent',
    category: { en: 'Dentist', es: 'Dentista' },
    city: 'Ciudad Juárez',
    blurb: {
      en: 'Dental clinic in Ciudad Juárez, a short trip from the El Paso bridges.',
      es: 'Clínica dental en Ciudad Juárez, a poca distancia de los puentes de El Paso.',
    },
    url: 'https://constandse-dental.vercel.app/',
    whatsapp: '19153007751',
    // Prefilled so the business sees where the patient came from.
    whatsappText: {
      en: 'Hi, I found your clinic on Border Pulse and would like to book an appointment.',
      es: 'Hola, encontré su consultorio en Border Pulse y quiero agendar una cita.',
    },
    // Ciudad Juárez crossings: PDN, BOTA, Ysleta, Stanton DCL, El Paso (combined).
    ports: ['240202', '240201', '240104', '240204', '240221'],
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

export function sponsorForPort(portNumber, today = todayIso()) {
  return SPONSORS.find(s => active(s, today) && s.ports?.includes(String(portNumber))) || null;
}
export function sponsorForGuide(slug, today = todayIso()) {
  return SPONSORS.find(s => active(s, today) && s.guides?.includes(slug)) || null;
}

// Outbound link with UTM so the clinic can see Border Pulse in its own analytics.
export function sponsorUrl(sponsor, placement) {
  const u = new URL(sponsor.url);
  u.searchParams.set('utm_source', 'borderpulse');
  u.searchParams.set('utm_medium', 'sponsored');
  u.searchParams.set('utm_campaign', placement);
  return u.toString();
}
