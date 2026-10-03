export interface DistrictLocation {
  name: string;
  lat: number;
  lng: number;
  bairros?: string[];
}

export interface ProvinceData {
  province: string;
  districts: DistrictLocation[];
}

export const MOZAMBIQUE_GEOGRAPHY: ProvinceData[] = [
  {
    province: 'Inhambane',
    districts: [
      { name: 'Massinga', lat: -23.3328, lng: 35.3789, bairros: ['Bairro Central', 'Eduardo Mondlane', 'Cangombe', 'Ressano Garcia', 'Malova'] },
      { name: 'Maxixe', lat: -23.8597, lng: 35.3472, bairros: ['Bairro Central', 'Chambone', 'Nhambalo', 'Rumbana', 'Agostinho Neto'] },
      { name: 'Inhambane (Cidade)', lat: -23.8650, lng: 35.3833, bairros: ['Balane 1', 'Balane 2', 'Chambone', 'Salela', 'Muele'] },
      { name: 'Vilankulo', lat: -22.0000, lng: 35.3167, bairros: ['Central', 'Chibuene', 'Mucoque', 'Alto Macassa'] },
      { name: 'Morrumbene', lat: -23.6333, lng: 35.3500, bairros: ['Sede', 'Mocodoene', 'Cambine'] },
      { name: 'Jangamo', lat: -24.0667, lng: 35.3167, bairros: ['Sede', 'Cumbana'] },
      { name: 'Homoíne', lat: -23.6833, lng: 35.1333, bairros: ['Sede', 'Pembe', 'Chizapela'] },
      { name: 'Inharrime', lat: -24.4833, lng: 35.0333, bairros: ['Sede', 'Mocumbi'] },
      { name: 'Zavala', lat: -24.6833, lng: 34.7000, bairros: ['Quissico', 'Zandamela'] },
      { name: 'Panda', lat: -24.0667, lng: 34.7333, bairros: ['Sede', 'Urrene', 'Inhassune'] },
      { name: 'Mabote', lat: -22.0333, lng: 34.1333, bairros: ['Sede', 'Zimane', 'Zinave'] },
      { name: 'Funhalouro', lat: -23.1000, lng: 34.4000, bairros: ['Sede', 'Tome'] },
      { name: 'Govuro', lat: -21.4333, lng: 35.0000, bairros: ['Nova Mambone', 'Save'] },
    ],
  },
  {
    province: 'Maputo Cidade',
    districts: [
      { name: 'KaMpfumo', lat: -25.9692, lng: 32.5732, bairros: ['Central', 'Polana Cimento', 'Alto Maé', 'Malhangalene', 'Coop'] },
      { name: 'KaNlhamankulu', lat: -25.9450, lng: 32.5600, bairros: ['Aeroporto', 'Chamanculo', 'Minkadjuine', 'Malanga', 'Munhuana'] },
      { name: 'KaMaxakeni', lat: -25.9300, lng: 32.5850, bairros: ['Mafalala', 'Maxaquene', 'Polana Caniço', 'Urbanização'] },
      { name: 'KaMavota', lat: -25.8800, lng: 32.5900, bairros: ['Mavalane', 'FPLM', 'Hulene', 'Ferroviário', 'Laulane', '3 de Fevereiro', 'Costa do Sol'] },
      { name: 'KaMubukwana', lat: -25.8900, lng: 32.5300, bairros: ['Bagamoyo', 'George Dimitrov (Benfica)', 'Inhagoia', 'Jardim', 'Luis Cabral', 'Zimpeto'] },
      { name: 'KaTembe', lat: -25.9900, lng: 32.5400, bairros: ['Chali', 'Chamissava', 'Guachene', 'Incassane'] },
      { name: 'KaNyaka', lat: -25.9800, lng: 32.9200, bairros: ['Ribzene', 'Nhaquene', 'Inguane'] },
    ],
  },
  {
    province: 'Maputo Província',
    districts: [
      { name: 'Matola (Cidade)', lat: -25.9622, lng: 32.4589, bairros: ['Matola C', 'Matola Rio', 'Machava', 'T3', 'Fomento', 'Liberdade', 'Trevo', 'Malhampsene', 'Boquisso'] },
      { name: 'Boane', lat: -26.0444, lng: 32.3278, bairros: ['Vila de Boane', 'Matola-Rio', 'Campoane', 'Eduardo Mondlane'] },
      { name: 'Marracuene', lat: -25.7167, lng: 32.6833, bairros: ['Vila de Marracuene', 'Guava', 'Mali', 'Macaneta', 'Michafutene'] },
      { name: 'Manhiça', lat: -25.4000, lng: 32.8000, bairros: ['Vila da Manhiça', 'Xinavane', 'Palmeira', '3 de Fevereiro'] },
      { name: 'Moamba', lat: -25.6000, lng: 32.2500, bairros: ['Vila de Moamba', 'Pessene', 'Ressano Garcia'] },
      { name: 'Namaacha', lat: -25.9667, lng: 32.0167, bairros: ['Vila de Namaacha', 'Changalane', 'Mahelane'] },
      { name: 'Matutuíne', lat: -26.5000, lng: 32.7000, bairros: ['Bela Vista', 'Ponta do Ouro', 'Catembe', 'Zitundo'] },
      { name: 'Magude', lat: -25.0333, lng: 32.6500, bairros: ['Vila de Magude', 'Motaze', 'Panjane'] },
    ],
  },
  {
    province: 'Gaza',
    districts: [
      { name: 'Xai-Xai (Cidade)', lat: -25.0458, lng: 33.6436, bairros: ['Central', 'Praia de Xai-Xai', 'Chonguene', 'Inhamissa', 'Marien Nguabi'] },
      { name: 'Chókwè', lat: -24.5333, lng: 33.0000, bairros: ['Central', 'Lionde', 'Guijá', 'Conhane'] },
      { name: 'Bilene (Praia do Bilene)', lat: -25.2667, lng: 33.2500, bairros: ['Vila do Bilene', 'Macia', 'Messano'] },
      { name: 'Chibuto', lat: -24.6833, lng: 33.5333, bairros: ['Vila de Chibuto', 'Alto Changane', 'Godide'] },
      { name: 'Mandlakazi', lat: -24.7000, lng: 33.9500, bairros: ['Vila de Mandlakazi', 'Macuacua', 'Chidenguele'] },
      { name: 'Guijá', lat: -24.5000, lng: 33.0833, bairros: ['Caniçado', 'Chivonguene'] },
      { name: 'Limpopo', lat: -25.0833, lng: 33.5000, bairros: ['Chissano', 'Zongoene'] },
      { name: 'Chonguene', lat: -24.9667, lng: 33.6667, bairros: ['Sede', 'Banhine'] },
      { name: 'Mabalane', lat: -23.8500, lng: 32.6000, bairros: ['Sede', 'Combomune'] },
      { name: 'Massingir', lat: -23.9167, lng: 32.1500, bairros: ['Sede', 'Zulo'] },
      { name: 'Chicualacuala', lat: -22.8000, lng: 31.8333, bairros: ['Vila Eduardo Mondlane', 'Pafuri'] },
      { name: 'Massangena', lat: -21.8333, lng: 32.9667, bairros: ['Sede', 'Mavue'] },
      { name: 'Chigubo', lat: -23.0000, lng: 33.5000, bairros: ['Dindiza', 'Sede'] },
      { name: 'Mapai', lat: -23.1500, lng: 32.0000, bairros: ['Sede', 'Machaila'] },
    ],
  },
  {
    province: 'Sofala',
    districts: [
      { name: 'Beira (Cidade)', lat: -19.8333, lng: 34.8500, bairros: ['Chaimite', 'Macuti', 'Ponta Gêa', 'Manga', 'Munhava', 'Estoril', 'Vaz', 'Inhamízua'] },
      { name: 'Dondo', lat: -19.6000, lng: 34.7500, bairros: ['Vila do Dondo', 'Mafambisse', 'Savane'] },
      { name: 'Nhamatanda', lat: -19.2667, lng: 34.2167, bairros: ['Vila de Nhamatanda', 'Tica', 'Metuchira'] },
      { name: 'Búzi', lat: -19.8833, lng: 34.6000, bairros: ['Vila do Búzi', 'Estaquinha', 'Nova Sofala'] },
      { name: 'Gorongosa', lat: -18.6833, lng: 34.0667, bairros: ['Vila de Gorongosa', 'Canda', 'Vunduzi'] },
      { name: 'Caia', lat: -17.8333, lng: 35.3333, bairros: ['Vila de Caia', 'Murraça', 'Sena'] },
      { name: 'Marromeu', lat: -18.3000, lng: 35.9333, bairros: ['Vila de Marromeu', 'Chupanga'] },
      { name: 'Chibabava', lat: -20.3000, lng: 33.5333, bairros: ['Sede', 'Goonda'] },
      { name: 'Machanga', lat: -20.9333, lng: 35.0000, bairros: ['Sede', 'Divinhe'] },
      { name: 'Cheringoma', lat: -18.7000, lng: 35.0000, bairros: ['Inhaminga', 'Sede'] },
      { name: 'Marínguè', lat: -18.0000, lng: 34.3333, bairros: ['Sede', 'Canxixe'] },
      { name: 'Muanza', lat: -18.9000, lng: 34.8000, bairros: ['Sede', 'Galinha'] },
    ],
  },
  {
    province: 'Manica',
    districts: [
      { name: 'Chimoio (Cidade)', lat: -19.1167, lng: 33.4833, bairros: ['Centro', 'Vila Nova', '7 de Abril', 'Eduardo Mondlane', 'Chitatha', 'Nhamaonha'] },
      { name: 'Gondola', lat: -19.1333, lng: 33.6500, bairros: ['Vila de Gondola', 'Cafumpe', 'Amatongas'] },
      { name: 'Manica', lat: -18.9333, lng: 32.8667, bairros: ['Vila de Manica', 'Machipanda', 'Mavonde'] },
      { name: 'Sussundenga', lat: -19.4000, lng: 33.2833, bairros: ['Sede', 'Dombe', 'Rotanda'] },
      { name: 'Vanduzi', lat: -18.9500, lng: 33.2667, bairros: ['Sede', 'Matsinho'] },
      { name: 'Báruè', lat: -17.8333, lng: 33.1833, bairros: ['Catandica', 'Choa', 'Nhampassa'] },
      { name: 'Mossurize', lat: -20.4500, lng: 33.0000, bairros: ['Espungabera', 'Chiurairue'] },
      { name: 'Macate', lat: -19.3833, lng: 33.6000, bairros: ['Sede', 'Zembe'] },
      { name: 'Machaze', lat: -21.0000, lng: 33.0000, bairros: ['Chitobe', 'Save'] },
      { name: 'Guro', lat: -17.4167, lng: 33.3500, bairros: ['Sede', 'Dacata'] },
      { name: 'Macossa', lat: -17.7667, lng: 33.9500, bairros: ['Sede', 'Nguawala'] },
      { name: 'Tambara', lat: -16.8000, lng: 34.2333, bairros: ['Nhacolo', 'Buzua'] },
    ],
  },
  {
    province: 'Tete',
    districts: [
      { name: 'Tete (Cidade)', lat: -16.1564, lng: 33.5864, bairros: ['Chingodzi', 'Degue', 'Matundo', 'Francisco Manyanga', 'Samora Machel', 'Josina Machel'] },
      { name: 'Moatize', lat: -16.1167, lng: 33.7333, bairros: ['Vila de Moatize', 'Bengubwe', 'Zóbuè', 'Cateme'] },
      { name: 'Angónia', lat: -14.7167, lng: 34.3667, bairros: ['Ulongué', 'Domué'] },
      { name: 'Cahora Bassa', lat: -15.6167, lng: 32.7500, bairros: ['Songo', 'Chitima'] },
      { name: 'Changara', lat: -16.4833, lng: 33.1500, bairros: ['Luenha', 'Marara'] },
      { name: 'Chiúta', lat: -15.5500, lng: 33.2833, bairros: ['Manje', 'Kazula'] },
      { name: 'Macanga', lat: -14.9833, lng: 33.6833, bairros: ['Furancungo', 'Chidzolomondo'] },
      { name: 'Magoé', lat: -15.8000, lng: 31.7500, bairros: ['Mphende', 'Mucumbura'] },
      { name: 'Marávia', lat: -15.1167, lng: 32.3333, bairros: ['Fingoe', 'Chipera'] },
      { name: 'Mutarara', lat: -17.4500, lng: 35.0833, bairros: ['Nhamayabué', 'Inhangoma'] },
      { name: 'Tsangano', lat: -15.1500, lng: 34.5000, bairros: ['Sede', 'Ntengo Wambalame'] },
      { name: 'Zumbo', lat: -15.6167, lng: 30.4500, bairros: ['Vila do Zumbo', 'Muze'] },
      { name: 'Doa', lat: -16.8000, lng: 34.8000, bairros: ['Sede', 'Chueza'] },
      { name: 'Marara', lat: -16.3000, lng: 33.4000, bairros: ['Sede', 'Mufa'] },
    ],
  },
  {
    province: 'Zambézia',
    districts: [
      { name: 'Quelimane (Cidade)', lat: -17.8786, lng: 36.8883, bairros: ['Central', 'Torrone', 'Coalane', 'Icidua', 'Samora Machel', 'Chitima', 'Madal'] },
      { name: 'Mocuba', lat: -16.8333, lng: 36.9833, bairros: ['Central', 'Aeroporto', 'Mugeba', 'Namanjavira'] },
      { name: 'Gurué', lat: -15.4667, lng: 36.9833, bairros: ['Vila de Gurué', 'Lioma', 'Tetete'] },
      { name: 'Alto Molócue', lat: -15.7500, lng: 37.6667, bairros: ['Vila de Alto Molócue', 'Nauela'] },
      { name: 'Milange', lat: -16.0833, lng: 35.7667, bairros: ['Vila de Milange', 'Majaua', 'Mongue'] },
      { name: 'Morrumbala', lat: -17.3167, lng: 35.5833, bairros: ['Sede', 'Chire', 'Derre'] },
      { name: 'Nicoadala', lat: -17.6000, lng: 36.8167, bairros: ['Sede', 'Munhamade', 'Maquival'] },
      { name: 'Namacurra', lat: -17.5000, lng: 37.0333, bairros: ['Sede', 'Macuse'] },
      { name: 'Maganja da Costa', lat: -17.3167, lng: 37.5000, bairros: ['Vila da Maganja', 'Baleia', 'Muzo'] },
      { name: 'Pebane', lat: -17.2667, lng: 38.1333, bairros: ['Vila de Pebane', 'Mulela', 'Naburi'] },
      { name: 'Chinde', lat: -18.5833, lng: 36.4667, bairros: ['Vila do Chinde', 'Luabo', 'Micaune'] },
      { name: 'Gilé', lat: -16.0333, lng: 38.3833, bairros: ['Sede', 'Alto Ligonha'] },
      { name: 'Ile', lat: -16.1000, lng: 37.1667, bairros: ['Sede', 'Socone', 'Namanda'] },
      { name: 'Inhassunge', lat: -17.9833, lng: 36.8500, bairros: ['Mucupia', 'Gonhane'] },
      { name: 'Lugela', lat: -16.4833, lng: 36.8667, bairros: ['Sede', 'Muabanama'] },
      { name: 'Derre', lat: -16.9000, lng: 36.1000, bairros: ['Sede', 'Guerissa'] },
      { name: 'Luabo', lat: -18.2500, lng: 36.1000, bairros: ['Sede', 'Samora Machel'] },
      { name: 'Mocubela', lat: -17.1500, lng: 37.8000, bairros: ['Sede', 'Bajone'] },
      { name: 'Mulevala', lat: -16.2500, lng: 37.7500, bairros: ['Sede', 'Chiraco'] },
    ],
  },
  {
    province: 'Nampula',
    districts: [
      { name: 'Nampula (Cidade)', lat: -15.1165, lng: 39.2666, bairros: ['Central', 'Muhala', 'Natikiri', 'Muatala', 'Namutequeliua', 'Napipine', 'Carrupeia'] },
      { name: 'Nacala-Porto', lat: -14.5428, lng: 40.6728, bairros: ['Central', 'Mahelene', 'Triângulo', 'Muanona', 'Ontupaia'] },
      { name: 'Ilha de Moçambique', lat: -15.0333, lng: 40.7333, bairros: ['Cidade de Pedra e Cal', 'Bairro de Macuti', 'Lumbo'] },
      { name: 'Angoche', lat: -16.2333, lng: 39.9000, bairros: ['Central', 'Inguri', 'Parapato'] },
      { name: 'Monapo', lat: -14.9333, lng: 40.3000, bairros: ['Vila de Monapo', 'Netia', 'Itoculo'] },
      { name: 'Meconta', lat: -14.9667, lng: 39.7500, bairros: ['Corrane', 'Namialo', 'Sede'] },
      { name: 'Malema', lat: -14.9500, lng: 37.4167, bairros: ['Vila de Malema', 'Mutuali', 'Chilaue'] },
      { name: 'Ribáuè', lat: -14.9667, lng: 38.3000, bairros: ['Vila de Ribáuè', 'Iapala', 'Kunle'] },
      { name: 'Mogovolas', lat: -15.6333, lng: 39.2833, bairros: ['Nametil', 'Muatua'] },
      { name: 'Moma', lat: -16.7500, lng: 39.2500, bairros: ['Macone', 'Mucoroge'] },
      { name: 'Mossuril', lat: -14.9667, lng: 40.6667, bairros: ['Sede', 'Matibane', 'Lumbo'] },
      { name: 'Memba', lat: -14.1833, lng: 40.5167, bairros: ['Sede', 'Mazua', 'Chipene'] },
      { name: 'Eráti', lat: -13.9167, lng: 39.6333, bairros: ['Namapa', 'Alua'] },
      { name: 'Lalaua', lat: -14.2833, lng: 37.9167, bairros: ['Sede', 'Meti'] },
      { name: 'Mecubúri', lat: -14.5000, lng: 38.9000, bairros: ['Sede', 'Milhana'] },
      { name: 'Muecate', lat: -14.8833, lng: 39.6000, bairros: ['Sede', 'Muculuone'] },
      { name: 'Murrupula', lat: -15.4667, lng: 38.6833, bairros: ['Sede', 'Chinga'] },
      { name: 'Nacala-a-Velha', lat: -14.5500, lng: 40.5500, bairros: ['Sede', 'Covo'] },
      { name: 'Nacarôa', lat: -14.4000, lng: 39.8000, bairros: ['Sede', 'Saua-Saua'] },
      { name: 'Rapale', lat: -15.0667, lng: 39.1167, bairros: ['Sede', 'Mutivaze'] },
      { name: 'Larde', lat: -16.5000, lng: 39.6000, bairros: ['Sede', 'Mucuali'] },
      { name: 'Liúpo', lat: -15.3000, lng: 40.3000, bairros: ['Sede', 'Quingerruene'] },
    ],
  },
  {
    province: 'Cabo Delgado',
    districts: [
      { name: 'Pemba (Cidade)', lat: -12.9732, lng: 40.5178, bairros: ['Central', 'Wimbe', 'Eduardo Mondlane', 'Paquitequete', 'Natite', 'Cariacó', 'Ingonane'] },
      { name: 'Montepuez', lat: -13.1256, lng: 38.9997, bairros: ['Central', 'Nacate', 'Mapupulo', 'Mirate'] },
      { name: 'Chiúre', lat: -13.5667, lng: 39.8333, bairros: ['Sede', 'Katapua', 'Ocua'] },
      { name: 'Mocímboa da Praia', lat: -11.3500, lng: 40.3500, bairros: ['Sede', 'Milamba', '30 de Junho'] },
      { name: 'Palma', lat: -10.7833, lng: 40.4833, bairros: ['Sede', 'Quitupo', 'Olumbe'] },
      { name: 'Ancuabe', lat: -12.9833, lng: 39.8500, bairros: ['Sede', 'Metoro', 'Meza'] },
      { name: 'Balama', lat: -13.3500, lng: 38.5667, bairros: ['Sede', 'Kuekue', 'Imbada'] },
      { name: 'Ibo', lat: -12.3500, lng: 40.5833, bairros: ['Vila do Ibo', 'Quirimba'] },
      { name: 'Macomia', lat: -12.2333, lng: 40.1167, bairros: ['Sede', 'Chai', 'Mucojo'] },
      { name: 'Mecúfi', lat: -13.2833, lng: 40.5500, bairros: ['Sede', 'Murrebue'] },
      { name: 'Meluco', lat: -12.5833, lng: 39.5333, bairros: ['Sede', 'Muaguide'] },
      { name: 'Mueda', lat: -11.6333, lng: 39.5667, bairros: ['Vila de Mueda', 'Chapa', 'Negomano'] },
      { name: 'Muidumbe', lat: -11.8000, lng: 39.7500, bairros: ['Namacande', 'Miteda'] },
      { name: 'Namuno', lat: -13.5833, lng: 38.7667, bairros: ['Sede', 'Machoca'] },
      { name: 'Quissanga', lat: -12.4333, lng: 40.4833, bairros: ['Sede', 'Bilibiza', 'Mahate'] },
    ],
  },
  {
    province: 'Niassa',
    districts: [
      { name: 'Lichinga (Cidade)', lat: -13.3128, lng: 35.2406, bairros: ['Central', 'Cerâmica', 'Chiuaula', 'Lualua', 'Nomba', 'Sanala'] },
      { name: 'Cuamba', lat: -14.8031, lng: 36.5372, bairros: ['Central', 'Adine 3', 'Mutivaze', 'Maguni'] },
      { name: 'Mandimba', lat: -14.3500, lng: 35.6500, bairros: ['Sede', 'Mitande'] },
      { name: 'Marrupa', lat: -13.1833, lng: 37.5000, bairros: ['Sede', 'Nungo', 'Marangira'] },
      { name: 'Mecanhelas', lat: -15.2500, lng: 35.8833, bairros: ['Insaca', 'Chiuta'] },
      { name: 'Lago', lat: -12.6000, lng: 34.8000, bairros: ['Metangula', 'Cobue', 'Maniamba'] },
      { name: 'Majune', lat: -13.1500, lng: 36.1500, bairros: ['Malanga', 'Nairto'] },
      { name: 'Maua', lat: -13.7833, lng: 37.2833, bairros: ['Sede', 'Maiaca'] },
      { name: 'Mavago', lat: -12.4333, lng: 36.6000, bairros: ['Sede', 'M’Sawize'] },
      { name: 'Ngauma', lat: -13.6833, lng: 35.5333, bairros: ['Massangulo', 'Itepela'] },
      { name: 'Nipepe', lat: -14.1500, lng: 37.8833, bairros: ['Sede', 'Mutuazi'] },
      { name: 'Sanga', lat: -12.8000, lng: 35.4000, bairros: ['Vila de Unango', 'Macaloge'] },
      { name: 'Muembe', lat: -13.0000, lng: 35.0000, bairros: ['Sede', 'Chirumba'] },
      { name: 'Chimbunila', lat: -13.4000, lng: 35.3000, bairros: ['Sede', 'Meponda'] },
    ],
  },
];

export const PROVINCES_LIST = MOZAMBIQUE_GEOGRAPHY.map((p) => p.province);

export function getDistrictsForProvince(provinceName: string): DistrictLocation[] {
  const p = MOZAMBIQUE_GEOGRAPHY.find(
    (item) => item.province.toLowerCase() === (provinceName || '').toLowerCase()
  );
  return p ? p.districts : MOZAMBIQUE_GEOGRAPHY[0].districts;
}

export function getCoordinatesForDistrict(
  provinceName: string,
  districtName: string
): { lat: number; lng: number } {
  const districts = getDistrictsForProvince(provinceName);
  const d = districts.find(
    (item) => item.name.toLowerCase() === (districtName || '').toLowerCase()
  );
  if (d) {
    // Add tiny random jitter (~100-300m) so multiple drivers in the same district don't perfectly stack
    const jitterLat = (Math.random() - 0.5) * 0.006;
    const jitterLng = (Math.random() - 0.5) * 0.006;
    return {
      lat: Math.round((d.lat + jitterLat) * 100000) / 100000,
      lng: Math.round((d.lng + jitterLng) * 100000) / 100000,
    };
  }
  return { lat: -23.3328, lng: 35.3789 }; // Fallback Massinga
}
