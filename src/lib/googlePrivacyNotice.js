// The same conditional disclosure appears in React and the served HTML.
export function googlePrivacyNotice(lang = 'en') {
  const es = lang === 'es';
  return {
    title: es ? 'Google y tus preferencias publicitarias' : 'Google and your advertising choices',
    paragraphs: [
      es ? 'Border Pulse se está preparando para Google AdSense. Los anuncios de Google aún no están activos en este sitio.' : 'Border Pulse is being prepared for Google AdSense. Google ads are not yet active on this site.',
      es ? 'Si se activan, Google y otros proveedores de publicidad pueden usar cookies para publicar anuncios basados en tus visitas anteriores a este sitio u otros sitios web. Las cookies publicitarias de Google permiten a Google y a sus socios publicar anuncios basados en esas visitas.' : 'If activated, Google and other advertising providers may use cookies to serve ads based on your prior visits to this or other websites. Google’s advertising cookies enable Google and its partners to serve ads based on those visits.',
      es ? 'Puedes gestionar o desactivar la publicidad personalizada de Google en Mi centro de anuncios y consultar las opciones de otros proveedores en aboutads.info. Estas opciones afectan la personalización; no eliminan todos los anuncios. Las opciones de consentimiento de este sitio para los anuncios de Google aún no están activas.' : 'You can manage or turn off Google’s personalized advertising in My Ad Center and find choices for other providers at aboutads.info. These choices affect personalization; they do not remove all ads. This site’s consent controls for Google ads are not yet active.',
    ],
    links: [
      { href: 'https://myadcenter.google.com/', label: es ? 'Mi centro de anuncios de Google' : 'Google My Ad Center' },
      { href: 'https://policies.google.com/technologies/ads', label: es ? 'Cómo usa Google los datos publicitarios' : 'How Google uses advertising data' },
      { href: 'https://optout.aboutads.info/', label: es ? 'Opciones de otros proveedores' : 'Choices for other providers' },
    ],
  };
}
