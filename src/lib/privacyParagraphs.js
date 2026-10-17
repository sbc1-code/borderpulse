// Shared disclosure text for React and visible HTML before JavaScript.
const paragraphs = {
  "cameras": {
    "es": "El panel y algunas páginas de cruces ofrecen cámaras públicas y enlaces a fuentes oficiales. Seleccionar una vista carga un reproductor de YouTube o IPCamLive, o una imagen de Caltrans; tu navegador se conecta directamente con ese servicio. Algunos enlaces abren la página del proveedor. Sus solicitudes, el acceso y la disponibilidad de las cámaras dependen del proveedor.",
    "en": "The dashboard and some crossing pages offer public cameras and links to official sources. Selecting a view loads a YouTube or IPCamLive player, or a Caltrans image; your browser connects directly to that service. Some links open the provider’s website. Its requests, access and camera availability depend on the provider."
  },
  "publicSite": {
    "es": "Border Pulse funciona sin cuenta. Las preferencias de idioma, tema y filtros pueden guardarse en el almacenamiento local del navegador. Los tiempos de espera provienen del feed público de U.S. Customs and Border Protection.",
    "en": "Border Pulse works without an account. Language, theme, and filter preferences may be saved in your browser’s local storage. Wait times come from the public U.S. Customs and Border Protection feed."
  },
  "analytics": {
    "es": "Las vistas de página se miden con Umami, una analítica sin cookies. Border Pulse no recibe documentos de viaje ni ubicación precisa.",
    "en": "Page views are measured with Umami, a cookieless analytics service. Border Pulse does not receive travel documents or precise location."
  },
  "adsterra": {
    "es": "Border Pulse muestra anuncios de terceros para ayudar a mantener la plataforma. El panel carga el script publicitario de Adsterra; los anuncios pueden no mostrarse si el servicio o el navegador los bloquea.",
    "en": "Border Pulse displays third-party ads to help support the platform. The dashboard loads Adsterra’s advertising script; ads may not appear if the service or browser blocks them."
  },
  "adsterraData": {
    "es": "Cuando se carga el script, tu navegador se conecta directamente con Adsterra. Su aviso de privacidad indica que puede procesar datos técnicos como la dirección IP, información del navegador y dispositivo, detalles de anuncios y datos de uso. Adsterra también describe el uso de cookies y otras tecnologías; las tecnologías concretas pueden variar según el anuncio o la campaña.",
    "en": "When the script loads, your browser connects directly to Adsterra. Its privacy notice says it may process technical data such as IP address, browser and device information, ad details, and usage data. Adsterra also describes its use of cookies and other technologies; the specific technologies may vary by ad or campaign."
  },
  "adsterraChoices": {
    "es": "El sitio no incluye una opción para desactivar anuncios. La configuración del navegador o un bloqueador puede impedir que el anuncio se cargue; consulta las políticas de Adsterra para gestionar sus cookies y prácticas de datos.",
    "en": "The site does not include an ad opt-out control. Browser settings or an ad blocker may prevent the ad from loading; see Adsterra’s policies for information about its cookies and data practices."
  }
};

export function privacyParagraphs(lang = 'en') {
  return Object.fromEntries(Object.entries(paragraphs).map(([key, value]) => [key, value[lang === 'es' ? 'es' : 'en']]));
}
