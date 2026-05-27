/**
 * guideData.js — static content for the canonical port guide pages.
 *
 * Each guide is a long-form SEO content page that complements the data-heavy
 * CrossingDetail view. Tips, logistics, and travel planning info that doesn't
 * change with every CBP refresh.
 *
 * Slugs here match the aggregate file slugs (san-ysidro, otay-mesa, tecate).
 */

export const GUIDE_PORTS = {
  'san-ysidro': {
    portNumber: '250401',
    name: 'San Ysidro',
    nameMX: 'El Chaparral / PedWest',
    state: 'CA',
    timezone: 'America/Los_Angeles',
    coords: { lat: 32.5422, lng: -117.0289 },
    hours: '24 hrs/day',
    lanes: ['Standard', 'Ready Lane', 'SENTRI', 'Pedestrian', 'Pedestrian Ready'],
    sentri: true,
    readyLane: true,
    pedestrian: true,
    tips: {
      en: [
        'San Ysidro is the busiest land border crossing in the Western Hemisphere. Expect long waits, especially on weekends and holidays.',
        'SENTRI lane is consistently the fastest option. If you cross regularly, the application process pays for itself quickly.',
        'Ready Lane requires a RFID-enabled document (passport card, Enhanced Driver License, or SENTRI/NEXUS/FAST card).',
        'Pedestrian crossings use PedWest (west side) or PedEast. PedWest is generally faster.',
        'Parking is available on both sides. On the US side, lots near the Las Americas Premium Outlets are convenient. On the Mexico side, parking lots line the approach to El Chaparral.',
        'Avoid Friday evenings (southbound) and Sunday afternoons (northbound) for the heaviest traffic.',
        'The trolley (Blue Line) runs to the San Ysidro Transit Center, steps from the pedestrian crossing.',
      ],
      es: [
        'San Ysidro es el cruce fronterizo terrestre mas transitado del hemisferio occidental. Espera filas largas, especialmente los fines de semana y dias festivos.',
        'El carril SENTRI es consistentemente la opcion mas rapida. Si cruzas con frecuencia, el proceso de solicitud se paga solo rapidamente.',
        'Ready Lane requiere un documento con RFID (tarjeta de pasaporte, licencia mejorada o tarjeta SENTRI/NEXUS/FAST).',
        'Los cruces peatonales usan PedWest (lado oeste) o PedEast. PedWest es generalmente mas rapido.',
        'Hay estacionamiento disponible en ambos lados. Del lado de EE.UU., los lotes cerca de Las Americas Premium Outlets son convenientes. Del lado de Mexico, los estacionamientos estan a lo largo del acceso a El Chaparral.',
        'Evita los viernes por la noche (hacia Mexico) y los domingos por la tarde (hacia EE.UU.) por el trafico mas pesado.',
        'El tranvia (Blue Line) llega al San Ysidro Transit Center, a pasos del cruce peatonal.',
      ],
    },
    faq: {
      en: [
        {
          q: 'What documents do I need to cross at San Ysidro?',
          a: 'US citizens need a valid passport, passport card, or SENTRI/NEXUS card. Mexican nationals need a valid passport and, if staying beyond the border zone, an FMM tourist permit. All travelers should check current requirements with CBP before traveling.',
        },
        {
          q: 'Is San Ysidro open 24 hours?',
          a: 'Yes. San Ysidro operates 24 hours a day, 7 days a week for vehicle and pedestrian crossings.',
        },
        {
          q: 'How do I get a SENTRI card?',
          a: 'Apply online through the CBP Trusted Traveler Programs portal (ttp.cbp.dhs.gov). The process includes a background check and in-person interview at an enrollment center. Processing typically takes 4 to 6 months.',
        },
        {
          q: 'Can I walk across at San Ysidro?',
          a: 'Yes. San Ysidro has two pedestrian crossings: PedWest on the west side and PedEast on the east. PedWest tends to have shorter wait times.',
        },
      ],
      es: [
        {
          q: 'Que documentos necesito para cruzar en San Ysidro?',
          a: 'Los ciudadanos estadounidenses necesitan un pasaporte valido, tarjeta de pasaporte o tarjeta SENTRI/NEXUS. Los nacionales mexicanos necesitan un pasaporte valido y, si se quedan mas alla de la zona fronteriza, un permiso de turista FMM. Todos los viajeros deben verificar los requisitos actuales con CBP antes de viajar.',
        },
        {
          q: 'San Ysidro esta abierto las 24 horas?',
          a: 'Si. San Ysidro opera las 24 horas del dia, los 7 dias de la semana para cruces vehiculares y peatonales.',
        },
        {
          q: 'Como obtengo una tarjeta SENTRI?',
          a: 'Solicita en linea a traves del portal de Programas de Viajero Confiable de CBP (ttp.cbp.dhs.gov). El proceso incluye una verificacion de antecedentes y una entrevista en persona en un centro de inscripcion. El procesamiento tarda tipicamente de 4 a 6 meses.',
        },
        {
          q: 'Puedo cruzar a pie en San Ysidro?',
          a: 'Si. San Ysidro tiene dos cruces peatonales: PedWest en el lado oeste y PedEast en el este. PedWest tiende a tener tiempos de espera mas cortos.',
        },
      ],
    },
  },

  'otay-mesa': {
    portNumber: '250601',
    name: 'Otay Mesa',
    nameMX: 'Mesa de Otay',
    state: 'CA',
    timezone: 'America/Los_Angeles',
    coords: { lat: 32.5487, lng: -116.9381 },
    hours: '24 hrs/day',
    lanes: ['Standard', 'Ready Lane', 'SENTRI', 'Commercial', 'FAST'],
    sentri: true,
    readyLane: true,
    pedestrian: false,
    tips: {
      en: [
        'Otay Mesa is the primary commercial crossing for the San Diego-Tijuana region. It handles significant truck traffic alongside passenger vehicles.',
        'Wait times here are typically shorter than San Ysidro for passenger vehicles, making it a smart alternative if you are driving.',
        'No pedestrian crossing is available at Otay Mesa. You must cross by vehicle.',
        'SENTRI and Ready Lane are available and usually significantly faster than the standard lane.',
        'The crossing is located east of downtown Tijuana. From the Tijuana side, take the Blvd. Industrial route to reach the port.',
        'Commercial hours and passenger hours both run 24/7, but truck traffic peaks in the early morning.',
        'Cross-Border Xpress (CBX) is nearby, connecting to Tijuana International Airport. If flying out of TIJ, this is a common route.',
      ],
      es: [
        'Otay Mesa es el cruce comercial principal para la region San Diego-Tijuana. Maneja trafico significativo de camiones junto con vehiculos de pasajeros.',
        'Los tiempos de espera aqui son tipicamente mas cortos que en San Ysidro para vehiculos de pasajeros, lo que lo hace una alternativa inteligente si vas en auto.',
        'No hay cruce peatonal disponible en Otay Mesa. Debes cruzar en vehiculo.',
        'SENTRI y Ready Lane estan disponibles y son usualmente significativamente mas rapidos que el carril estandar.',
        'El cruce esta ubicado al este del centro de Tijuana. Desde el lado de Tijuana, toma la ruta del Blvd. Industrial para llegar al puerto.',
        'El horario comercial y de pasajeros opera 24/7, pero el trafico de camiones tiene su pico temprano en la manana.',
        'Cross-Border Xpress (CBX) esta cerca, conectando con el Aeropuerto Internacional de Tijuana. Si vuelas desde TIJ, esta es una ruta comun.',
      ],
    },
    faq: {
      en: [
        {
          q: 'Is Otay Mesa faster than San Ysidro?',
          a: 'Generally yes for passenger vehicles. Otay Mesa typically has shorter wait times than San Ysidro, especially during peak hours. However, commercial truck traffic can cause delays during early morning hours.',
        },
        {
          q: 'Can I walk across at Otay Mesa?',
          a: 'No. Otay Mesa does not have a pedestrian crossing. You must cross by vehicle. For pedestrian crossings, use San Ysidro or Tecate.',
        },
        {
          q: 'Is Otay Mesa open 24 hours?',
          a: 'Yes. Both passenger and commercial lanes operate 24 hours a day.',
        },
        {
          q: 'What is CBX and how does it relate to Otay Mesa?',
          a: 'Cross-Border Xpress (CBX) is a pedestrian bridge near Otay Mesa that connects the US side directly to Tijuana International Airport. It is a separate facility from the Otay Mesa port of entry.',
        },
      ],
      es: [
        {
          q: 'Es Otay Mesa mas rapido que San Ysidro?',
          a: 'Generalmente si para vehiculos de pasajeros. Otay Mesa tipicamente tiene tiempos de espera mas cortos que San Ysidro, especialmente en horas pico. Sin embargo, el trafico de camiones comerciales puede causar demoras durante las primeras horas de la manana.',
        },
        {
          q: 'Puedo cruzar a pie en Otay Mesa?',
          a: 'No. Otay Mesa no tiene cruce peatonal. Debes cruzar en vehiculo. Para cruces peatonales, usa San Ysidro o Tecate.',
        },
        {
          q: 'Otay Mesa esta abierto las 24 horas?',
          a: 'Si. Tanto los carriles de pasajeros como los comerciales operan las 24 horas del dia.',
        },
        {
          q: 'Que es CBX y como se relaciona con Otay Mesa?',
          a: 'Cross-Border Xpress (CBX) es un puente peatonal cerca de Otay Mesa que conecta el lado de EE.UU. directamente con el Aeropuerto Internacional de Tijuana. Es una instalacion separada del puerto de entrada de Otay Mesa.',
        },
      ],
    },
  },

  'tecate': {
    portNumber: '250501',
    name: 'Tecate',
    nameMX: 'Tecate',
    state: 'CA',
    timezone: 'America/Los_Angeles',
    coords: { lat: 32.5725, lng: -116.6267 },
    hours: '5:00 AM-11:00 PM',
    lanes: ['Standard', 'Pedestrian'],
    sentri: false,
    readyLane: false,
    pedestrian: true,
    tips: {
      en: [
        'Tecate is a small-town crossing with significantly shorter wait times than San Ysidro or Otay Mesa. A good option if you are heading east of Tijuana.',
        'The port is NOT open 24 hours. Current hours are 5:00 AM to 11:00 PM. Plan your crossing accordingly.',
        'No SENTRI or Ready Lane is available here. All vehicles use the standard lane.',
        'Pedestrian crossing is available during operating hours.',
        'Tecate is known for its brewery (Cerveceria Tecate) and the Rancho La Puerta wellness resort. The town has a quieter, small-city feel compared to Tijuana.',
        'The drive from San Diego to Tecate takes about 1 hour via CA-94. Worth it if you want to avoid the San Ysidro congestion.',
        'Mexican auto insurance is required if you are driving into Mexico. Purchase it before you cross.',
      ],
      es: [
        'Tecate es un cruce de pueblo pequeno con tiempos de espera significativamente mas cortos que San Ysidro u Otay Mesa. Buena opcion si te diriges al este de Tijuana.',
        'El puerto NO esta abierto las 24 horas. El horario actual es de 5:00 AM a 11:00 PM. Planifica tu cruce en consecuencia.',
        'No hay SENTRI ni Ready Lane disponible aqui. Todos los vehiculos usan el carril estandar.',
        'El cruce peatonal esta disponible durante el horario de operacion.',
        'Tecate es conocido por su cerveceria (Cerveceria Tecate) y el resort de bienestar Rancho La Puerta. La ciudad tiene un ambiente mas tranquilo y de pueblo comparado con Tijuana.',
        'El viaje de San Diego a Tecate toma aproximadamente 1 hora por la CA-94. Vale la pena si quieres evitar la congestion de San Ysidro.',
        'El seguro de auto mexicano es obligatorio si vas a manejar en Mexico. Adquierelo antes de cruzar.',
      ],
    },
    faq: {
      en: [
        {
          q: 'What are the hours at Tecate port of entry?',
          a: 'Tecate is open from 5:00 AM to 11:00 PM daily. It is NOT a 24-hour port. Hours may vary on US federal holidays.',
        },
        {
          q: 'Does Tecate have SENTRI?',
          a: 'No. Tecate does not offer SENTRI or Ready Lane. All vehicles use the standard lane. If you have a SENTRI card, it can still serve as a valid identification document.',
        },
        {
          q: 'Is Tecate worth the drive from San Diego?',
          a: 'It depends on your final destination. The drive from San Diego is about 1 hour via CA-94, but wait times at Tecate are often 15 to 30 minutes versus 1 to 2+ hours at San Ysidro. If you are heading to the wine country of Valle de Guadalupe, Tecate is the closer crossing.',
        },
        {
          q: 'Can I walk across at Tecate?',
          a: 'Yes. Tecate has a pedestrian crossing that operates during port hours (5:00 AM to 11:00 PM).',
        },
      ],
      es: [
        {
          q: 'Cual es el horario del puerto de entrada de Tecate?',
          a: 'Tecate esta abierto de 5:00 AM a 11:00 PM diariamente. NO es un puerto de 24 horas. Los horarios pueden variar en dias festivos federales de EE.UU.',
        },
        {
          q: 'Tecate tiene SENTRI?',
          a: 'No. Tecate no ofrece SENTRI ni Ready Lane. Todos los vehiculos usan el carril estandar. Si tienes una tarjeta SENTRI, puede servir como documento de identificacion valido.',
        },
        {
          q: 'Vale la pena manejar desde San Diego a Tecate?',
          a: 'Depende de tu destino final. El viaje desde San Diego es de aproximadamente 1 hora por la CA-94, pero los tiempos de espera en Tecate son a menudo de 15 a 30 minutos versus 1 a 2+ horas en San Ysidro. Si te diriges a la zona vinicola del Valle de Guadalupe, Tecate es el cruce mas cercano.',
        },
        {
          q: 'Puedo cruzar a pie en Tecate?',
          a: 'Si. Tecate tiene un cruce peatonal que opera durante el horario del puerto (5:00 AM a 11:00 PM).',
        },
      ],
    },
  },
};

export const GUIDE_SLUGS = Object.keys(GUIDE_PORTS);
