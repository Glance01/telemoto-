/**
 * Estrutura administrativa oficial e coordenadas geográficas de Moçambique
 * Províncias -> Distritos -> Coordenadas exatas para mapeamento
 * Base de dados de pontos de interesse (POIs) e locais populares para TeleMoto+
 */

export interface ProvinceData {
  name: string;
  districts: string[];
}

export type PlaceCategory =
  | 'all'
  | 'market'
  | 'transport'
  | 'health'
  | 'education'
  | 'fuel'
  | 'bank'
  | 'beach'
  | 'neighborhood'
  | 'public';

export interface MozambiquePlace {
  id: string;
  name: string;
  category: PlaceCategory;
  categoryLabel: string;
  icon: string;
  district: string;
  province: string;
  lat: number;
  lng: number;
  description?: string;
}

export const MOZAMBIQUE_ADMIN_DIVISIONS: Record<string, string[]> = {
  'Inhambane': [
    'Massinga',
    'Maxixe',
    'Inhambane (Cidade)',
    'Vilankulo',
    'Morrumbene',
    'Homoíne',
    'Jangamo',
    'Inharrime',
    'Zavala (Quissico)',
    'Panda',
    'Mabote',
    'Funhalouro',
    'Govuro (Nova Mambone)',
  ],
  'Maputo Cidade': [
    'Distrito Municipal KaMpfumo',
    'Distrito Municipal Nlhamankulu',
    'Distrito Municipal KaMaxakeni',
    'Distrito Municipal KaMavota',
    'Distrito Municipal KaMubukwana',
    'Distrito Municipal KaTembe',
    'Distrito Municipal KaNyaka',
  ],
  'Maputo Província': [
    'Matola (Cidade)',
    'Boane',
    'Marracuene',
    'Manhiça',
    'Moamba',
    'Namaacha',
    'Matutuíne (Bela Vista)',
    'Magude',
  ],
  'Gaza': [
    'Xai-Xai (Cidade)',
    'Chókwè',
    'Bilene (Praia do Bilene)',
    'Chibuto',
    'Mandlakazi',
    'Guijá',
    'Limpopo',
    'Mabalane',
    'Massingir',
    'Chicualacuala',
    'Chigubo',
    'Massangena',
    'Mapai',
  ],
  'Sofala': [
    'Beira (Cidade)',
    'Dondo',
    'Nhamatanda',
    'Búzi',
    'Gorongosa',
    'Caia',
    'Marromeu',
    'Cheringoma (Inhaminga)',
    'Machanga',
    'Muanza',
    'Chemba',
    'Chibabava',
  ],
  'Manica': [
    'Chimoio (Cidade)',
    'Gondola',
    'Manica',
    'Sussundenga',
    'Bárue (Catandica)',
    'Mossurize (Espungabera)',
    'Macate',
    'Vanduzi',
    'Guro',
    'Macossa',
    'Tambara',
  ],
  'Tete': [
    'Tete (Cidade)',
    'Moatize',
    'Changara',
    'Angónia (Ulongué)',
    'Cahora Bassa (Songo)',
    'Tsangano',
    'Macanga (Furancungo)',
    'Marávia (Fingoè)',
    'Mutarara',
    'Chiúta',
    'Chifunde',
    'Zumbo',
    'Dôa',
    'Marinkue',
  ],
  'Zambézia': [
    'Quelimane (Cidade)',
    'Mocuba',
    'Gurué',
    'Alto Molócue',
    'Milange',
    'Morrumbala',
    'Nicoadala',
    'Namacurra',
    'Maganja da Costa',
    'Pebane',
    'Ile',
    'Lugela',
    'Inhassunge',
    'Chinde',
    'Mopeia',
    'Derre',
    'Luabo',
    'Mocubela',
    'Mulevala',
  ],
  'Nampula': [
    'Nampula (Cidade)',
    'Nacala-Porto',
    'Angoche',
    'Ilha de Moçambique',
    'Monapo',
    'Meconta',
    'Ribáuè',
    'Mogovolas (Nametil)',
    'Malema',
    'Murrupula',
    'Mossuril',
    'Nacala-a-Velha',
    'Eráti (Namapa)',
    'Memba',
    'Muecate',
    'Mecubúri',
    'Larde',
    'Liúpo',
  ],
  'Cabo Delgado': [
    'Pemba (Cidade)',
    'Montepuez',
    'Mocímboa da Praia',
    'Chiúre',
    'Ancuabe',
    'Balama',
    'Mueda',
    'Namuno',
    'Palma',
    'Macomia',
    'Meluco',
    'Mecúfi',
    'Ibo',
    'Quissanga',
    'Muidumbe',
  ],
  'Niassa': [
    'Lichinga (Cidade)',
    'Cuamba',
    'Mandimba',
    'Metarica',
    'Marrupa',
    'Mecanhelas',
    'Majune',
    'Lago (Metangula)',
    'Sanga',
    'Ngaúma',
    'Muembe',
    'Mavago',
    'Chimbunila',
  ],
};

export const PROVINCES_LIST = Object.keys(MOZAMBIQUE_ADMIN_DIVISIONS);

/**
 * Coordenadas geográficas dos Distritos e Capitais de Moçambique
 */
export const MOZAMBIQUE_DISTRICT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Inhambane
  'massinga': { lat: -23.3328, lng: 35.3789 },
  'maxixe': { lat: -23.8597, lng: 35.3472 },
  'inhambane': { lat: -23.8650, lng: 35.3833 },
  'inhambane (cidade)': { lat: -23.8650, lng: 35.3833 },
  'vilankulo': { lat: -22.0000, lng: 35.3167 },
  'morrumbene': { lat: -23.6833, lng: 35.3500 },
  'homoíne': { lat: -23.9500, lng: 35.1667 },
  'homoine': { lat: -23.9500, lng: 35.1667 },
  'jangamo': { lat: -24.0833, lng: 35.3167 },
  'inharrime': { lat: -24.4833, lng: 35.0333 },
  'zavala': { lat: -24.6833, lng: 34.7333 },
  'zavala (quissico)': { lat: -24.6833, lng: 34.7333 },
  'panda': { lat: -24.0667, lng: 34.7333 },
  'mabote': { lat: -22.0333, lng: 34.1333 },
  'funhalouro': { lat: -23.0833, lng: 34.3833 },
  'govuro': { lat: -21.4167, lng: 35.0667 },
  'govuro (nova mambone)': { lat: -21.4167, lng: 35.0667 },

  // Maputo Cidade
  'distrito municipal kampfumo': { lat: -25.9680, lng: 32.5730 },
  'kampfumo': { lat: -25.9680, lng: 32.5730 },
  'maputo': { lat: -25.9680, lng: 32.5730 },
  'maputo cidade': { lat: -25.9680, lng: 32.5730 },
  'distrito municipal nlhamankulu': { lat: -25.9520, lng: 32.5550 },
  'nlhamankulu': { lat: -25.9520, lng: 32.5550 },
  'distrito municipal kamaxakeni': { lat: -25.9380, lng: 32.5800 },
  'kamaxakeni': { lat: -25.9380, lng: 32.5800 },
  'distrito municipal kamavota': { lat: -25.8850, lng: 32.6100 },
  'kamavota': { lat: -25.8850, lng: 32.6100 },
  'distrito municipal kamubukwana': { lat: -25.8500, lng: 32.5600 },
  'kamubukwana': { lat: -25.8500, lng: 32.5600 },
  'distrito municipal katembe': { lat: -26.0100, lng: 32.5500 },
  'katembe': { lat: -26.0100, lng: 32.5500 },
  'distrito municipal kanyaka': { lat: -25.9800, lng: 32.9300 },
  'kanyaka': { lat: -25.9800, lng: 32.9300 },

  // Maputo Província
  'matola': { lat: -25.9622, lng: 32.4589 },
  'matola (cidade)': { lat: -25.9622, lng: 32.4589 },
  'maputo província': { lat: -25.9622, lng: 32.4589 },
  'boane': { lat: -26.0400, lng: 32.3300 },
  'marracuene': { lat: -25.7100, lng: 32.6700 },
  'manhiça': { lat: -25.4000, lng: 32.8000 },
  'manhica': { lat: -25.4000, lng: 32.8000 },
  'moamba': { lat: -25.6000, lng: 32.2400 },
  'namaacha': { lat: -25.9700, lng: 32.0200 },
  'matutuíne': { lat: -26.3400, lng: 32.6700 },
  'matutuine': { lat: -26.3400, lng: 32.6700 },
  'magude': { lat: -25.0200, lng: 32.6500 },

  // Gaza
  'xai-xai': { lat: -25.0450, lng: 33.6420 },
  'xai-xai (cidade)': { lat: -25.0450, lng: 33.6420 },
  'gaza': { lat: -25.0450, lng: 33.6420 },
  'chókwè': { lat: -24.5333, lng: 32.9833 },
  'chokwe': { lat: -24.5333, lng: 32.9833 },
  'bilene': { lat: -25.2600, lng: 33.2400 },
  'bilene (praia do bilene)': { lat: -25.2600, lng: 33.2400 },
  'chibuto': { lat: -24.6833, lng: 33.5333 },
  'mandlakazi': { lat: -24.7167, lng: 33.9500 },
  'guijá': { lat: -24.5000, lng: 33.0000 },
  'limpopo': { lat: -25.0000, lng: 33.5000 },
  'mabalane': { lat: -23.8500, lng: 32.6000 },
  'massingir': { lat: -23.9167, lng: 32.1500 },
  'chicualacuala': { lat: -22.8000, lng: 31.8500 },
  'chigubo': { lat: -22.8333, lng: 33.5000 },
  'massangena': { lat: -21.5000, lng: 32.9500 },
  'mapai': { lat: -23.1000, lng: 32.0000 },

  // Sofala
  'beira': { lat: -19.8436, lng: 34.8389 },
  'beira (cidade)': { lat: -19.8436, lng: 34.8389 },
  'sofala': { lat: -19.8436, lng: 34.8389 },
  'dondo': { lat: -19.6100, lng: 34.7500 },
  'nhamatanda': { lat: -19.2600, lng: 34.2100 },
  'búzi': { lat: -19.8800, lng: 34.6000 },
  'buzi': { lat: -19.8800, lng: 34.6000 },
  'gorongosa': { lat: -18.6800, lng: 34.0700 },
  'caia': { lat: -17.8300, lng: 35.3400 },
  'marromeu': { lat: -18.3000, lng: 35.9400 },
  'cheringoma': { lat: -18.2300, lng: 34.9200 },
  'machanga': { lat: -20.9300, lng: 35.0300 },
  'muanza': { lat: -18.8900, lng: 34.8500 },
  'chemba': { lat: -17.1500, lng: 34.8800 },
  'chibabava': { lat: -20.2800, lng: 33.9500 },

  // Manica
  'chimoio': { lat: -19.1167, lng: 33.4833 },
  'chimoio (cidade)': { lat: -19.1167, lng: 33.4833 },
  'manica': { lat: -18.9300, lng: 32.8800 },
  'gondola': { lat: -19.1300, lng: 33.6500 },
  'sussundenga': { lat: -19.4100, lng: 33.2700 },
  'bárue': { lat: -17.7500, lng: 33.1800 },
  'barue': { lat: -17.7500, lng: 33.1800 },
  'mossurize': { lat: -20.4500, lng: 32.7700 },
  'macate': { lat: -19.4000, lng: 33.5000 },
  'vanduzi': { lat: -18.9500, lng: 33.2500 },
  'guro': { lat: -16.8500, lng: 33.3500 },
  'macossa': { lat: -17.7000, lng: 34.0000 },
  'tambara': { lat: -16.7000, lng: 34.2500 },

  // Tete
  'tete': { lat: -16.1564, lng: 33.5862 },
  'tete (cidade)': { lat: -16.1564, lng: 33.5862 },
  'moatize': { lat: -16.1200, lng: 33.7300 },
  'changara': { lat: -16.5800, lng: 33.2000 },
  'angónia': { lat: -14.7200, lng: 34.3700 },
  'angonia': { lat: -14.7200, lng: 34.3700 },
  'cahora bassa': { lat: -15.6100, lng: 32.7700 },
  'tsangano': { lat: -15.2000, lng: 34.4000 },
  'macanga': { lat: -14.9000, lng: 33.6200 },
  'marávia': { lat: -15.1000, lng: 32.5000 },
  'mutarara': { lat: -17.4300, lng: 35.0800 },
  'chiúta': { lat: -15.5500, lng: 33.2800 },
  'chifunde': { lat: -14.5000, lng: 32.5500 },
  'zumbo': { lat: -15.6200, lng: 30.4500 },
  'dôa': { lat: -16.8000, lng: 34.8000 },

  // Zambézia
  'quelimane': { lat: -17.8786, lng: 36.8883 },
  'quelimane (cidade)': { lat: -17.8786, lng: 36.8883 },
  'zambézia': { lat: -17.8786, lng: 36.8883 },
  'zambezia': { lat: -17.8786, lng: 36.8883 },
  'mocuba': { lat: -16.8333, lng: 36.9833 },
  'gurué': { lat: -15.4667, lng: 36.9833 },
  'gurue': { lat: -15.4667, lng: 36.9833 },
  'alto molócue': { lat: -15.7500, lng: 37.6667 },
  'alto molocue': { lat: -15.7500, lng: 37.6667 },
  'milange': { lat: -16.0333, lng: 35.7667 },
  'morrumbala': { lat: -17.3200, lng: 35.5800 },
  'nicoadala': { lat: -17.6000, lng: 36.8000 },
  'namacurra': { lat: -17.5000, lng: 37.0300 },
  'maganja da costa': { lat: -17.3200, lng: 37.5000 },
  'pebane': { lat: -17.2600, lng: 38.1300 },
  'ile': { lat: -16.0800, lng: 37.1800 },
  'lugela': { lat: -16.2000, lng: 36.7000 },
  'inhassunge': { lat: -18.0500, lng: 36.9500 },
  'chinde': { lat: -18.5800, lng: 36.4600 },
  'mopeia': { lat: -17.9800, lng: 35.7300 },

  // Nampula
  'nampula': { lat: -15.1165, lng: 39.2666 },
  'nampula (cidade)': { lat: -15.1165, lng: 39.2666 },
  'nacala-porto': { lat: -14.5428, lng: 40.6728 },
  'nacala': { lat: -14.5428, lng: 40.6728 },
  'angoche': { lat: -16.2300, lng: 39.9000 },
  'ilha de moçambique': { lat: -15.0342, lng: 40.7306 },
  'monapo': { lat: -14.9000, lng: 40.3000 },
  'meconta': { lat: -15.0000, lng: 39.7500 },
  'ribáuè': { lat: -14.9600, lng: 38.3000 },
  'ribaue': { lat: -14.9600, lng: 38.3000 },
  'mogovolas': { lat: -15.7500, lng: 39.3000 },
  'malema': { lat: -14.9500, lng: 37.4000 },
  'murrupula': { lat: -15.5000, lng: 38.7000 },
  'mossuril': { lat: -14.9500, lng: 40.6700 },
  'nacala-a-velha': { lat: -14.5000, lng: 40.5000 },
  'eráti': { lat: -13.7200, lng: 39.8000 },
  'memba': { lat: -14.1800, lng: 40.5000 },
  'muecate': { lat: -14.8800, lng: 39.6000 },

  // Cabo Delgado
  'pemba': { lat: -12.9732, lng: 40.5178 },
  'pemba (cidade)': { lat: -12.9732, lng: 40.5178 },
  'cabo delgado': { lat: -12.9732, lng: 40.5178 },
  'montepuez': { lat: -13.1256, lng: 38.9997 },
  'mocímboa da praia': { lat: -11.3500, lng: 40.3500 },
  'mocimboa da praia': { lat: -11.3500, lng: 40.3500 },
  'chiúre': { lat: -13.6000, lng: 39.8500 },
  'chiure': { lat: -13.6000, lng: 39.8500 },
  'ancuabe': { lat: -12.9800, lng: 39.8500 },
  'balama': { lat: -13.3500, lng: 38.5600 },
  'mueda': { lat: -11.6300, lng: 39.5500 },
  'namuno': { lat: -13.7000, lng: 38.8000 },
  'palma': { lat: -10.7800, lng: 40.4800 },
  'macomia': { lat: -12.2300, lng: 40.1000 },
  'ibo': { lat: -12.3500, lng: 40.6000 },

  // Niassa
  'lichinga': { lat: -13.3128, lng: 35.2406 },
  'lichinga (cidade)': { lat: -13.3128, lng: 35.2406 },
  'niassa': { lat: -13.3128, lng: 35.2406 },
  'cuamba': { lat: -14.8031, lng: 36.5372 },
  'mandimba': { lat: -14.3500, lng: 35.6500 },
  'metarica': { lat: -14.4000, lng: 36.8000 },
  'marrupa': { lat: -13.2000, lng: 37.5000 },
  'mecanhelas': { lat: -15.2000, lng: 35.9000 },
  'majune': { lat: -13.2000, lng: 36.1000 },
  'lago': { lat: -12.7000, lng: 34.8000 },
  'sanga': { lat: -12.4000, lng: 35.3000 },
  'ngaúma': { lat: -13.5000, lng: 35.4000 },
};

/**
 * Catálogo rico de locais de referência para as principais cidades e distritos de Moçambique
 */
export const POPULAR_LANDMARKS_DATABASE: MozambiquePlace[] = [
  // ===================== MASSINGA (INHAMBANE) =====================
  {
    id: 'mass-mercado-central',
    name: 'Mercado Central de Massinga',
    category: 'market',
    categoryLabel: 'Mercado',
    icon: '🛒',
    district: 'Massinga',
    province: 'Inhambane',
    lat: -23.3315,
    lng: 35.3795,
    description: 'Comércio geral, produtos frescos e mercearias no centro da vila',
  },
  {
    id: 'mass-paragem-chapas',
    name: 'Paragem Principal de Chapas de Massinga',
    category: 'transport',
    categoryLabel: 'Transporte',
    icon: '🚐',
    district: 'Massinga',
    province: 'Inhambane',
    lat: -23.3340,
    lng: 35.3780,
    description: 'Terminal de chapas para Maxixe, Vilankulo, Morrumbene e Maputo',
  },
  {
    id: 'mass-hospital-distrital',
    name: 'Hospital Distrital de Massinga',
    category: 'health',
    categoryLabel: 'Saúde',
    icon: '🏥',
    district: 'Massinga',
    province: 'Inhambane',
    lat: -23.3280,
    lng: 35.3745,
    description: 'Atendimento de urgência e consultas gerais de Massinga',
  },
  {
    id: 'mass-bombas-petromoc',
    name: 'Bombas Petromoc Massinga (EN1)',
    category: 'fuel',
    categoryLabel: 'Combustível',
    icon: '⛽',
    district: 'Massinga',
    province: 'Inhambane',
    lat: -23.3360,
    lng: 35.3760,
    description: 'Abastecimento 24h e conveniência na Estrada Nacional nº 1',
  },
  {
    id: 'mass-bombas-galp',
    name: 'Bombas Galp / TotalEnergies Massinga',
    category: 'fuel',
    categoryLabel: 'Combustível',
    icon: '⛽',
    district: 'Massinga',
    province: 'Inhambane',
    lat: -23.3290,
    lng: 35.3810,
    description: 'Posto de abastecimento e loja de conveniência',
  },
  {
    id: 'mass-escola-secundaria',
    name: 'Escola Secundária de Massinga',
    category: 'education',
    categoryLabel: 'Educação',
    icon: '🏫',
    district: 'Massinga',
    province: 'Inhambane',
    lat: -23.3370,
    lng: 35.3820,
    description: 'Principal centro de ensino secundário e técnico de Massinga',
  },
  {
    id: 'mass-conselho-municipal',
    name: 'Conselho Municipal de Massinga',
    category: 'public',
    categoryLabel: 'Serviços Públicos',
    icon: '🏛️',
    district: 'Massinga',
    province: 'Inhambane',
    lat: -23.3320,
    lng: 35.3775,
    description: 'Sede administrativa do município e registos',
  },
  {
    id: 'mass-banco-bim',
    name: 'Millennium BIM / BCI Massinga',
    category: 'bank',
    categoryLabel: 'Banco & ATM',
    icon: '🏦',
    district: 'Massinga',
    province: 'Inhambane',
    lat: -23.3330,
    lng: 35.3785,
    description: 'Agências bancárias, caixas automáticas ATM e agentes M-Pesa',
  },
  {
    id: 'mass-bairro-1-maio',
    name: 'Bairro 1 de Maio',
    category: 'neighborhood',
    categoryLabel: 'Bairro',
    icon: '📍',
    district: 'Massinga',
    province: 'Inhambane',
    lat: -23.3250,
    lng: 35.3820,
    description: 'Zona residencial dinâmica próxima da zona central',
  },
  {
    id: 'mass-bairro-chicomo',
    name: 'Bairro Chicomo',
    category: 'neighborhood',
    categoryLabel: 'Bairro',
    icon: '📍',
    district: 'Massinga',
    province: 'Inhambane',
    lat: -23.3410,
    lng: 35.3740,
    description: 'Bairro residencial de Massinga',
  },
  {
    id: 'mass-bairro-quiongo',
    name: 'Bairro Quiongo / Lionde',
    category: 'neighborhood',
    categoryLabel: 'Bairro',
    icon: '📍',
    district: 'Massinga',
    province: 'Inhambane',
    lat: -23.3380,
    lng: 35.3860,
    description: 'Área residencial com lojas e comércio local',
  },
  {
    id: 'mass-praia-morrungulo',
    name: 'Praia de Morrungulo',
    category: 'beach',
    categoryLabel: 'Praia & Lazer',
    icon: '🏖️',
    district: 'Massinga',
    province: 'Inhambane',
    lat: -23.2350,
    lng: 35.4950,
    description: 'Estância turística costeira com resorts e paisagem marítima',
  },
  {
    id: 'mass-praia-rio-pedras',
    name: 'Praia de Rio das Pedras',
    category: 'beach',
    categoryLabel: 'Praia & Lazer',
    icon: '🏖️',
    district: 'Massinga',
    province: 'Inhambane',
    lat: -23.2900,
    lng: 35.4600,
    description: 'Praia turística conhecida pela tranquilidade e pesca desportiva',
  },

  // ===================== MAXIXE (INHAMBANE) =====================
  {
    id: 'max-cais-dhows',
    name: 'Cais dos Dhows / Barcos de Travessia Maxixe',
    category: 'transport',
    categoryLabel: 'Transporte',
    icon: '⛵',
    district: 'Maxixe',
    province: 'Inhambane',
    lat: -23.8610,
    lng: 35.3520,
    description: 'Travessia de barco para a Cidade de Inhambane',
  },
  {
    id: 'max-mercado-central',
    name: 'Mercado Central da Maxixe',
    category: 'market',
    categoryLabel: 'Mercado',
    icon: '🛒',
    district: 'Maxixe',
    province: 'Inhambane',
    lat: -23.8580,
    lng: 35.3460,
    description: 'Grande centro comercial da cidade económica de Inhambane',
  },
  {
    id: 'max-hospital-rural',
    name: 'Hospital Rural da Maxixe',
    category: 'health',
    categoryLabel: 'Saúde',
    icon: '🏥',
    district: 'Maxixe',
    province: 'Inhambane',
    lat: -23.8520,
    lng: 35.3420,
    description: 'Hospital de referência na Maxixe',
  },
  {
    id: 'max-terminal-junta',
    name: 'Terminal Rodoviário da Maxixe (Chapas EN1)',
    category: 'transport',
    categoryLabel: 'Transporte',
    icon: '🚐',
    district: 'Maxixe',
    province: 'Inhambane',
    lat: -23.8630,
    lng: 35.3440,
    description: 'Paragem de autocarros interprovinciais e chapas locais',
  },
  {
    id: 'max-unisave',
    name: 'Universidade Save (UniSave Maxixe)',
    category: 'education',
    categoryLabel: 'Educação',
    icon: '🎓',
    district: 'Maxixe',
    province: 'Inhambane',
    lat: -23.8680,
    lng: 35.3390,
    description: 'Campus universitário de formação superior',
  },

  // ===================== INHAMBANE (CIDADE) =====================
  {
    id: 'inh-mercado-central',
    name: 'Mercado Municipal de Inhambane',
    category: 'market',
    categoryLabel: 'Mercado',
    icon: '🛒',
    district: 'Inhambane (Cidade)',
    province: 'Inhambane',
    lat: -23.8640,
    lng: 35.3845,
    description: 'Mercado histórico com mariscos frescos e produtos regionais',
  },
  {
    id: 'inh-hospital-provincial',
    name: 'Hospital Provincial de Inhambane',
    category: 'health',
    categoryLabel: 'Saúde',
    icon: '🏥',
    district: 'Inhambane (Cidade)',
    province: 'Inhambane',
    lat: -23.8680,
    lng: 35.3810,
    description: 'Maior centro hospitalar da província de Inhambane',
  },
  {
    id: 'inh-praia-tofo',
    name: 'Praia do Tofo',
    category: 'beach',
    categoryLabel: 'Praia & Lazer',
    icon: '🏖️',
    district: 'Inhambane (Cidade)',
    province: 'Inhambane',
    lat: -23.8560,
    lng: 35.5450,
    description: 'Destino mundial de mergulho, surf e vida noturna',
  },
  {
    id: 'inh-praia-barra',
    name: 'Praia da Barra',
    category: 'beach',
    categoryLabel: 'Praia & Lazer',
    icon: '🏖️',
    district: 'Inhambane (Cidade)',
    province: 'Inhambane',
    lat: -23.7950,
    lng: 35.5180,
    description: 'Lagoa, farol histórico e resorts turísticos',
  },
  {
    id: 'inh-aeroporto',
    name: 'Aeroporto de Inhambane (INH)',
    category: 'transport',
    categoryLabel: 'Transporte',
    icon: '✈️',
    district: 'Inhambane (Cidade)',
    province: 'Inhambane',
    lat: -23.8760,
    lng: 35.4080,
    description: 'Voos domésticos e ligações para Maputo e Joanesburgo',
  },

  // ===================== VILANKULO (INHAMBANE) =====================
  {
    id: 'vil-mercado-central',
    name: 'Mercado Municipal de Vilankulo',
    category: 'market',
    categoryLabel: 'Mercado',
    icon: '🛒',
    district: 'Vilankulo',
    province: 'Inhambane',
    lat: -22.0120,
    lng: 35.3180,
    description: 'Mercado vibrante no centro da vila costeira',
  },
  {
    id: 'vil-aeroporto',
    name: 'Aeroporto Internacional de Vilankulo (VNX)',
    category: 'transport',
    categoryLabel: 'Transporte',
    icon: '✈️',
    district: 'Vilankulo',
    province: 'Inhambane',
    lat: -22.0180,
    lng: 35.3130,
    description: 'Porta de entrada para o Arquipélago de Bazaruto',
  },
  {
    id: 'vil-praia-bazaruto',
    name: 'Praia Principal de Vilankulo (Ponto de Barcos)',
    category: 'beach',
    categoryLabel: 'Praia & Lazer',
    icon: '🏖️',
    district: 'Vilankulo',
    province: 'Inhambane',
    lat: -21.9950,
    lng: 35.3250,
    description: 'Embarque para as ilhas de Bazaruto e Benguerra',
  },

  // ===================== MAPUTO CIDADE =====================
  {
    id: 'mpt-baixa-mercado-central',
    name: 'Mercado Central de Maputo (Baixa)',
    category: 'market',
    categoryLabel: 'Mercado',
    icon: '🛒',
    district: 'Distrito Municipal KaMpfumo',
    province: 'Maputo Cidade',
    lat: -25.9712,
    lng: 32.5714,
    description: 'Histórico mercado da Baixa com artesanato, especiarias e frutas',
  },
  {
    id: 'mpt-hospital-central',
    name: 'Hospital Central de Maputo (HCM)',
    category: 'health',
    categoryLabel: 'Saúde',
    icon: '🏥',
    district: 'Distrito Municipal KaMpfumo',
    province: 'Maputo Cidade',
    lat: -25.9640,
    lng: 32.5850,
    description: 'Maior hospital e centro médico de referência de Moçambique',
  },
  {
    id: 'mpt-costa-do-sol',
    name: 'Praia da Costa do Sol / Marginal',
    category: 'beach',
    categoryLabel: 'Praia & Lazer',
    icon: '🏖️',
    district: 'Distrito Municipal KaMavota',
    province: 'Maputo Cidade',
    lat: -25.9220,
    lng: 32.6280,
    description: 'Avenida Marginal, restaurantes de marisco e praia',
  },
  {
    id: 'mpt-terminal-junta',
    name: 'Terminal Rodoviário da Junta (Interprovincial)',
    category: 'transport',
    categoryLabel: 'Transporte',
    icon: '🚌',
    district: 'Distrito Municipal KaMubukwana',
    province: 'Maputo Cidade',
    lat: -25.9280,
    lng: 32.5520,
    description: 'Principal paragem de autocarros para o Norte, Centro e Gaza/Inhambane',
  },
  {
    id: 'mpt-uem-campus',
    name: 'Campus Universitário UEM (Eduardo Mondlane)',
    category: 'education',
    categoryLabel: 'Educação',
    icon: '🎓',
    district: 'Distrito Municipal KaMaxakeni',
    province: 'Maputo Cidade',
    lat: -25.9510,
    lng: 32.5980,
    description: 'Campus principal da mais antiga universidade de Moçambique',
  },
  {
    id: 'mpt-mercado-peixe',
    name: 'Novo Mercado do Peixe (Marginal)',
    category: 'market',
    categoryLabel: 'Mercado & Restaurantes',
    icon: '🐟',
    district: 'Distrito Municipal KaMaxakeni',
    province: 'Maputo Cidade',
    lat: -25.9450,
    lng: 32.6180,
    description: 'Bancadas de peixe fresco e área de confeção e restauração',
  },
  {
    id: 'mpt-aeroporto-mavalane',
    name: 'Aeroporto Internacional de Maputo (MPM)',
    category: 'transport',
    categoryLabel: 'Transporte',
    icon: '✈️',
    district: 'Distrito Municipal KaMavota',
    province: 'Maputo Cidade',
    lat: -25.9208,
    lng: 32.5726,
    description: 'Principal aeroporto internacional de Moçambique',
  },
  {
    id: 'mpt-shopping-24',
    name: 'Maputo Shopping Centre / Centro 24',
    category: 'market',
    categoryLabel: 'Shopping',
    icon: '🛍️',
    district: 'Distrito Municipal KaMpfumo',
    province: 'Maputo Cidade',
    lat: -25.9720,
    lng: 32.5690,
    description: 'Cinemas, praça de alimentação e lojas de vestuário',
  },

  // ===================== MATOLA (MAPUTO PROVÍNCIA) =====================
  {
    id: 'mat-mercado-santos',
    name: 'Mercado Santos da Matola',
    category: 'market',
    categoryLabel: 'Mercado',
    icon: '🛒',
    district: 'Matola (Cidade)',
    province: 'Maputo Província',
    lat: -25.9610,
    lng: 32.4630,
    description: 'Comércio central de produtos frescos e vestuário',
  },
  {
    id: 'mat-hospital-provincial',
    name: 'Hospital Provincial da Matola',
    category: 'health',
    categoryLabel: 'Saúde',
    icon: '🏥',
    district: 'Matola (Cidade)',
    province: 'Maputo Província',
    lat: -25.9550,
    lng: 32.4720,
    description: 'Centro de saúde de referência da província de Maputo',
  },
  {
    id: 'mat-paragem-missao',
    name: 'Paragem da Missão / Fomento',
    category: 'transport',
    categoryLabel: 'Transporte',
    icon: '🚐',
    district: 'Matola (Cidade)',
    province: 'Maputo Província',
    lat: -25.9580,
    lng: 32.4950,
    description: 'Ponto chave de circulação de chapas e mototáxis na Matola',
  },

  // ===================== BEIRA (SOFALA) =====================
  {
    id: 'bei-mercado-central',
    name: 'Mercado Central da Beira',
    category: 'market',
    categoryLabel: 'Mercado',
    icon: '🛒',
    district: 'Beira (Cidade)',
    province: 'Sofala',
    lat: -19.8320,
    lng: 34.8410,
    description: 'Centro histórico e de compras da Cidade da Beira',
  },
  {
    id: 'bei-hospital-central',
    name: 'Hospital Central da Beira (HCB)',
    category: 'health',
    categoryLabel: 'Saúde',
    icon: '🏥',
    district: 'Beira (Cidade)',
    province: 'Sofala',
    lat: -19.8250,
    lng: 34.8480,
    description: 'Hospital universitário e de especialidades da região Centro',
  },
  {
    id: 'bei-praia-macuti',
    name: 'Praia do Macuti / Farol',
    category: 'beach',
    categoryLabel: 'Praia & Lazer',
    icon: '🏖️',
    district: 'Beira (Cidade)',
    province: 'Sofala',
    lat: -19.8450,
    lng: 34.8950,
    description: 'Zona de lazer marítima, farol histórico e esplanadas',
  },
  {
    id: 'bei-porto-beira',
    name: 'Porto da Beira (Corredor da Beira)',
    category: 'transport',
    categoryLabel: 'Transporte & Carga',
    icon: '🚢',
    district: 'Beira (Cidade)',
    province: 'Sofala',
    lat: -19.8200,
    lng: 34.8350,
    description: 'Porto comercial estratégico para o Zimbabué e Malawi',
  },

  // ===================== NAMPULA (CIDADE) =====================
  {
    id: 'nam-mercado-central',
    name: 'Mercado Central de Nampula',
    category: 'market',
    categoryLabel: 'Mercado',
    icon: '🛒',
    district: 'Nampula (Cidade)',
    province: 'Nampula',
    lat: -15.1180,
    lng: 39.2680,
    description: 'Coração comercial da capital do Norte',
  },
  {
    id: 'nam-hospital-central',
    name: 'Hospital Central de Nampula (HCN)',
    category: 'health',
    categoryLabel: 'Saúde',
    icon: '🏥',
    district: 'Nampula (Cidade)',
    province: 'Nampula',
    lat: -15.1120,
    lng: 39.2740,
    description: 'Maior hospital de referência da região Norte de Moçambique',
  },
  {
    id: 'nam-aeroporto',
    name: 'Aeroporto Internacional de Nampula (APL)',
    category: 'transport',
    categoryLabel: 'Transporte',
    icon: '✈️',
    district: 'Nampula (Cidade)',
    province: 'Nampula',
    lat: -15.1050,
    lng: 39.2810,
    description: 'Ligações aéreas nacionais e internacionais',
  },

  // ===================== XAI-XAI & BILENE (GAZA) =====================
  {
    id: 'xai-mercado-limpopo',
    name: 'Mercado Municipal de Xai-Xai',
    category: 'market',
    categoryLabel: 'Mercado',
    icon: '🛒',
    district: 'Xai-Xai (Cidade)',
    province: 'Gaza',
    lat: -25.0480,
    lng: 33.6450,
    description: 'Mercado à beira do Rio Limpopo',
  },
  {
    id: 'xai-praia-xai-xai',
    name: 'Praia de Xai-Xai / Recifes',
    category: 'beach',
    categoryLabel: 'Praia & Lazer',
    icon: '🏖️',
    district: 'Xai-Xai (Cidade)',
    province: 'Gaza',
    lat: -25.1200,
    lng: 33.7250,
    description: 'Praia famosa pelos recifes e piscina natural',
  },
  {
    id: 'bil-lagoa-bilene',
    name: 'Praia e Lagoa Uembje (Bilene)',
    category: 'beach',
    categoryLabel: 'Praia & Lazer',
    icon: '🏖️',
    district: 'Bilene (Praia do Bilene)',
    province: 'Gaza',
    lat: -25.2650,
    lng: 33.2450,
    description: 'Lagoa de água salgada, desportos náuticos e turismo',
  },

  // ===================== CHIMOIO (MANICA) =====================
  {
    id: 'chi-mercado-feira',
    name: 'Mercado 38 / Feira de Chimoio',
    category: 'market',
    categoryLabel: 'Mercado',
    icon: '🛒',
    district: 'Chimoio (Cidade)',
    province: 'Manica',
    lat: -19.1150,
    lng: 33.4860,
    description: 'Grande centro agrícola e de comércio da província de Manica',
  },
  {
    id: 'chi-cabeca-velho',
    name: 'Monumento Cabeça do Velho (Monte Binga)',
    category: 'public',
    categoryLabel: 'Turismo',
    icon: '⛰️',
    district: 'Chimoio (Cidade)',
    province: 'Manica',
    lat: -19.1080,
    lng: 33.4750,
    description: 'Ponto turístico e símbolo emblemático da cidade de Chimoio',
  },

  // ===================== TETE (CIDADE) =====================
  {
    id: 'tet-ponte-samora',
    name: 'Ponte Samora Machel / Rio Zambeze',
    category: 'transport',
    categoryLabel: 'Transporte',
    icon: '🌉',
    district: 'Tete (Cidade)',
    province: 'Tete',
    lat: -16.1550,
    lng: 33.5900,
    description: 'Cruzamento rodoviário principal sobre o majestoso Rio Zambeze',
  },
  {
    id: 'tet-mercado-degue',
    name: 'Mercado Degue de Tete',
    category: 'market',
    categoryLabel: 'Mercado',
    icon: '🛒',
    district: 'Tete (Cidade)',
    province: 'Tete',
    lat: -16.1580,
    lng: 33.5820,
    description: 'Comércio de alimentos e artigos diversos em Tete',
  },

  // ===================== QUELIMANE (ZAMBÉZIA) =====================
  {
    id: 'que-catedral-velha',
    name: 'Catedral Velha / Marginal do Rio dos Bons Sinais',
    category: 'public',
    categoryLabel: 'Turismo',
    icon: '⛪',
    district: 'Quelimane (Cidade)',
    province: 'Zambézia',
    lat: -17.8760,
    lng: 36.8850,
    description: 'Marginal histórica e zona de passeios em Quelimane',
  },
  {
    id: 'que-praia-zalala',
    name: 'Praia de Zalala',
    category: 'beach',
    categoryLabel: 'Praia & Lazer',
    icon: '🏖️',
    district: 'Quelimane (Cidade)',
    province: 'Zambézia',
    lat: -17.7300,
    lng: 37.1500,
    description: 'Praia de coqueiros e areia fina a ~30km de Quelimane',
  },

  // ===================== PEMBA (CABO DELGADO) =====================
  {
    id: 'pem-praia-wimbi',
    name: 'Praia do Wimbi (Wimbe)',
    category: 'beach',
    categoryLabel: 'Praia & Lazer',
    icon: '🏖️',
    district: 'Pemba (Cidade)',
    province: 'Cabo Delgado',
    lat: -12.9680,
    lng: 40.5420,
    description: 'Baía de Pemba com restaurantes de praia e mar azul-turquesa',
  },
  {
    id: 'pem-mercado-natite',
    name: 'Mercado Natite / Paquitequete',
    category: 'market',
    categoryLabel: 'Mercado',
    icon: '🛒',
    district: 'Pemba (Cidade)',
    province: 'Cabo Delgado',
    lat: -12.9750,
    lng: 40.5120,
    description: 'Bairro histórico de pescadores e mercado tradicional',
  },
];

/**
 * Retorna as coordenadas geográficas precisas para uma província / distrito
 */
export function getDistrictCoordinates(
  province: string,
  district?: string
): { lat: number; lng: number } {
  const cleanDistrict = (district || '').trim().toLowerCase();
  const cleanProvince = (province || '').trim().toLowerCase();

  // 1. Procurar por correspondência exata ou parcial de distrito
  if (cleanDistrict) {
    if (MOZAMBIQUE_DISTRICT_COORDINATES[cleanDistrict]) {
      return MOZAMBIQUE_DISTRICT_COORDINATES[cleanDistrict];
    }
    for (const [key, coords] of Object.entries(MOZAMBIQUE_DISTRICT_COORDINATES)) {
      if (cleanDistrict.includes(key) || key.includes(cleanDistrict)) {
        return coords;
      }
    }
  }

  // 2. Procurar pela província
  if (cleanProvince) {
    if (MOZAMBIQUE_DISTRICT_COORDINATES[cleanProvince]) {
      return MOZAMBIQUE_DISTRICT_COORDINATES[cleanProvince];
    }
    for (const [key, coords] of Object.entries(MOZAMBIQUE_DISTRICT_COORDINATES)) {
      if (cleanProvince.includes(key) || key.includes(cleanProvince)) {
        return coords;
      }
    }
  }

  // 3. Fallback para Massinga / Maputo
  return { lat: -23.3328, lng: 35.3789 };
}

/**
 * Adiciona uma pequena variação aleatória de ~150-300 metros para que múltiplos motoristas
 * no mesmo bairro/distrito apareçam como marcadores distintos no mapa
 */
export function addCoordinateJitter(coords: { lat: number; lng: number }): { lat: number; lng: number } {
  const jitterLat = (Math.random() - 0.5) * 0.005; // ~250m
  const jitterLng = (Math.random() - 0.5) * 0.005;
  return {
    lat: Number((coords.lat + jitterLat).toFixed(6)),
    lng: Number((coords.lng + jitterLng).toFixed(6)),
  };
}

/**
 * Retorna uma lista de locais populares e pontos de interesse para o distrito selecionado.
 * Se não houver pontos específicos registados, gera pontos contextuais realistas para aquele distrito.
 */
export function getPlacesForDistrict(
  province: string,
  district: string
): MozambiquePlace[] {
  const cleanDistrict = district.trim().toLowerCase();
  const districtCoords = getDistrictCoordinates(province, district);

  // 1. Encontrar pontos no banco estático correspondentes ao distrito
  const matched = POPULAR_LANDMARKS_DATABASE.filter((place) => {
    const pDist = place.district.toLowerCase();
    return (
      pDist.includes(cleanDistrict) ||
      cleanDistrict.includes(pDist) ||
      (province && place.province.toLowerCase() === province.toLowerCase() && pDist.includes(cleanDistrict.split(' ')[0]))
    );
  });

  if (matched.length >= 5) {
    return matched;
  }

  // 2. Se houver menos de 5 pontos, complementar com pontos de referência padrão gerados em torno das coordenadas do distrito
  const defaultTemplates = [
    {
      suffix: 'Mercado Central',
      category: 'market' as PlaceCategory,
      categoryLabel: 'Mercado',
      icon: '🛒',
      offsetLat: 0.004,
      offsetLng: 0.003,
      description: 'Centro comercial e produtos frescos da sede distrital',
    },
    {
      suffix: 'Paragem Principal de Chapas',
      category: 'transport' as PlaceCategory,
      categoryLabel: 'Transporte',
      icon: '🚐',
      offsetLat: -0.005,
      offsetLng: 0.004,
      description: 'Terminal de passageiros e transportes interdistritais',
    },
    {
      suffix: 'Hospital Distrital / Centro de Saúde',
      category: 'health' as PlaceCategory,
      categoryLabel: 'Saúde',
      icon: '🏥',
      offsetLat: 0.007,
      offsetLng: -0.005,
      description: 'Atendimento médico e urgências',
    },
    {
      suffix: 'Bombas de Combustível (Petromoc / Galp)',
      category: 'fuel' as PlaceCategory,
      categoryLabel: 'Combustível',
      icon: '⛽',
      offsetLat: -0.006,
      offsetLng: -0.004,
      description: 'Abastecimento e conveniência',
    },
    {
      suffix: 'Escola Secundária',
      category: 'education' as PlaceCategory,
      categoryLabel: 'Educação',
      icon: '🏫',
      offsetLat: 0.005,
      offsetLng: 0.008,
      description: 'Centro de ensino secundário da vila',
    },
    {
      suffix: 'Conselho Municipal / Administração Distrital',
      category: 'public' as PlaceCategory,
      categoryLabel: 'Serviços Públicos',
      icon: '🏛️',
      offsetLat: -0.002,
      offsetLng: 0.002,
      description: 'Sede administrativa do distrito',
    },
    {
      suffix: 'Bancos BIM / BCI & Balcão M-Pesa',
      category: 'bank' as PlaceCategory,
      categoryLabel: 'Banco & ATM',
      icon: '🏦',
      offsetLat: 0.002,
      offsetLng: -0.003,
      description: 'Serviços financeiros e levantamento de dinheiro',
    },
    {
      suffix: 'Bairro 1 de Maio',
      category: 'neighborhood' as PlaceCategory,
      categoryLabel: 'Bairro',
      icon: '📍',
      offsetLat: 0.009,
      offsetLng: 0.006,
      description: 'Zona residencial',
    },
    {
      suffix: 'Bairro Central',
      category: 'neighborhood' as PlaceCategory,
      categoryLabel: 'Bairro',
      icon: '📍',
      offsetLat: -0.003,
      offsetLng: -0.005,
      description: 'Área residencial e pequenos negócios',
    },
    {
      suffix: 'Praia / Zona de Lazer',
      category: 'beach' as PlaceCategory,
      categoryLabel: 'Lazer',
      icon: '🏖️',
      offsetLat: 0.015,
      offsetLng: 0.014,
      description: 'Ponto turístico e de lazer local',
    },
  ];

  const generated: MozambiquePlace[] = defaultTemplates.map((t, idx) => ({
    id: `gen-${cleanDistrict.replace(/\s+/g, '-')}-${idx}`,
    name: `${t.suffix} (${district})`,
    category: t.category,
    categoryLabel: t.categoryLabel,
    icon: t.icon,
    district,
    province,
    lat: Number((districtCoords.lat + t.offsetLat).toFixed(6)),
    lng: Number((districtCoords.lng + t.offsetLng).toFixed(6)),
    description: t.description,
  }));

  return [...matched, ...generated];
}

/**
 * Motor de busca e sugestões para Moçambique:
 * Garantia estrita de isolamento de sugestões por distrito (ex: Massinga só mostra locais de Massinga).
 */
export function searchMozambiquePlaces(
  query: string,
  selectedProvince: string = 'Inhambane',
  selectedDistrict: string = 'Massinga',
  categoryFilter: PlaceCategory = 'all'
): MozambiquePlace[] {
  const cleanQ = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // 1. Obter STRICTAMENTE os pontos do distrito selecionado do passageiro
  let districtPlaces = getPlacesForDistrict(selectedProvince, selectedDistrict);

  // Filtrar por categoria se ativado
  if (categoryFilter !== 'all') {
    districtPlaces = districtPlaces.filter((p) => p.category === categoryFilter);
  }

  // 2. Se NÃO houver termo de busca, retornar EXCLUSIVAMENTE os locais de Massinga / distrito do passageiro
  if (!cleanQ) {
    return districtPlaces;
  }

  // 3. Se houver termo de busca, pesquisar primeiro nos locais do distrito do passageiro
  const localMatches = districtPlaces.filter((place) => {
    const name = place.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const cat = (place.categoryLabel || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const desc = (place.description || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return name.includes(cleanQ) || cat.includes(cleanQ) || desc.includes(cleanQ);
  });

  if (localMatches.length > 0) {
    return localMatches;
  }

  // 4. Se a pesquisa não encontrou locais no distrito atual, e o utilizador escreveu o nome de outro distrito/cidade
  // (ex: escreveu "Maxixe" ou "Maputo"), permitir procurar no catálogo nacional
  const isQueryingOtherDistrict = PROVINCES_LIST.some((prov) =>
    cleanQ.includes(prov.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  ) || Object.values(MOZAMBIQUE_ADMIN_DIVISIONS).some((dists) =>
    dists.some((d) => cleanQ.includes(d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
  );

  if (isQueryingOtherDistrict || cleanQ.length >= 3) {
    const nationalMatches = POPULAR_LANDMARKS_DATABASE.filter((place) => {
      const name = place.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const dist = place.district
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const prov = place.province
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      return name.includes(cleanQ) || dist.includes(cleanQ) || prov.includes(cleanQ);
    });

    if (nationalMatches.length > 0) {
      return nationalMatches;
    }
  }

  return [];
}
