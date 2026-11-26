const SISTER_CITY_GROUPS = [
  [['250401', '250601'], 'Tijuana San Diego Baja California'],
  [['250601'], 'Otay Cross Border Xpress CBX'],
  [['250501'], 'Tecate Baja California'],
  [['250302', '250301'], 'Mexicali Baja California Centro Nuevo'],
  [['250201'], 'Los Algodones Molar City Baja California Yuma'],
  [['260801', '260802'], 'San Luis Rio Colorado Sonora Yuma'],
  [['260201'], 'Sonoyta Sonora Puerto Penasco Rocky Point'],
  [['260401', '260402', '260403'], 'Nogales Sonora'],
  [['260301', '260101'], 'Naco Agua Prieta Sonora'],
  [['240601'], 'Puerto Palomas Chihuahua'],
  [['240202', '240201', '240104', '240204', '240221', '240801', '240401', 'l24501'], 'Ciudad Juarez Chihuahua'],
  [['l24501'], 'El Porvenir'],
  [['240301'], 'Ojinaga Chihuahua'],
  [['230201'], 'Ciudad Acuna Coahuila'],
  [['230301', '230302'], 'Piedras Negras Coahuila'],
  [['230401', '230402', '230403', '230404'], 'Nuevo Laredo Tamaulipas'],
  [['230403'], 'Colombia Nuevo Leon'],
  [['231001', '230701'], 'Miguel Aleman Camargo Tamaulipas'],
  [['230503', '230501', '230502', '230902', '230901'], 'Reynosa McAllen Tamaulipas'],
  [['230902'], 'Rio Bravo Donna'],
  [['230901'], 'Nuevo Progreso Las Flores'],
  [['535503', '535501', '535504', '535502'], 'Matamoros Tamaulipas'],
  [['535503'], 'Lucio Blanco Valle Hermoso Harlingen'],
  [['535501'], 'Puente Viejo'],
  [['535504'], 'Puerta Mexico'],
  [['535502'], 'Los Tomates'],
];

export const PORT_SEARCH_TERMS = SISTER_CITY_GROUPS.reduce((acc, [ports, terms]) => {
  for (const p of ports) acc[p] = acc[p] ? `${acc[p]} ${terms}` : terms;
  return acc;
}, {});
