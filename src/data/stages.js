// ============================================
// Nepali Racer - Main Stage Data
// ============================================

const stageSpecs = [
  ['ktm_valley', 'Kathmandu Valley', 'Kathmandu Valley', 'valley', 'rolling_hills', 2500, 1, 'free', 0],
  ['ew_highway', 'E-W Highway', 'East-West Highway', 'highway', 'flat', 3000, 2, 'coins', 200],
  ['pokhara_hills', 'Pokhara Hills', 'Pokhara', 'hills', 'rolling_hills', 2800, 2, 'diamonds', 15],
  ['mustang_road', 'Mustang Road', 'Mustang', 'dry_mountain', 'rocky', 3500, 3, 'diamonds', 30],
  ['himalayan_route', 'Himalayan Route', 'Himalayas', 'snow_mountain', 'steep_hills', 4000, 4, 'diamonds', 50],
  ['khokana', 'Khokana Village Road', 'Khokana', 'village', 'valley', 2900, 2, 'coins', 300],
  ['ktm_nijgadh_fast_track', 'Kathmandu-Nijgadh Fast Track', 'Khokana to Nijgadh', 'fast_track', 'expressway', 3600, 3, 'diamonds', 20],
  ['nijgadh_fast_track', 'Nijgadh Fast Track', 'Nijgadh, Bara', 'fast_track', 'expressway', 3400, 3, 'diamonds', 22],
  ['nijgadh_hetauda', 'Nijgadh-Hetauda', 'Bara to Makwanpur', 'terai', 'rolling_hills', 3000, 2, 'coins', 400],
  ['hetauda_hills', 'Hetauda Hills', 'Hetauda', 'hills', 'steep_hills', 3100, 3, 'coins', 450],
  ['tribhuvan_highway', 'Tribhuvan Highway', 'Makwanpur', 'highway', 'mountain_road', 3300, 3, 'coins', 500],
  ['makwanpur_hills', 'Makwanpur Hills', 'Makwanpur', 'hills', 'steep_hills', 3200, 3, 'diamonds', 25],
  ['muglin_road', 'Muglin Road', 'Chitwan', 'river', 'valley', 3400, 3, 'coins', 600],
  ['prithvi_highway', 'Prithvi Highway', 'Dhading', 'highway', 'rolling_hills', 3500, 3, 'coins', 650],
  ['kathmandu_pokhara', 'Kathmandu-Pokhara Road', 'Central Nepal', 'highway', 'mountain_road', 3600, 3, 'diamonds', 30],
  ['pokhara_valley', 'Pokhara Valley', 'Pokhara', 'valley', 'rolling_hills', 3000, 2, 'coins', 750],
  ['sarangkot', 'Sarangkot', 'Kaski', 'hills', 'steep_hills', 3100, 3, 'coins', 800],
  ['begnas', 'Begnas Lake Road', 'Pokhara', 'lake', 'valley', 2900, 2, 'diamonds', 35],
  ['chitwan', 'Chitwan Road', 'Chitwan', 'jungle', 'flat', 2800, 2, 'coins', 900],
  ['narayangadh', 'Narayangadh Highway', 'Chitwan', 'highway', 'flat', 3000, 2, 'coins', 950],
  ['bharatpur', 'Bharatpur Roads', 'Bharatpur', 'urban', 'flat', 2700, 2, 'diamonds', 40],
  ['narayangadh_muglin', 'Narayangadh-Muglin', 'Chitwan', 'river', 'valley', 3500, 3, 'coins', 1050],
  ['gorkha', 'Gorkha Hills', 'Gorkha', 'hills', 'steep_hills', 3200, 3, 'coins', 1100],
  ['bandipur', 'Bandipur Ridge', 'Tanahun', 'village', 'mountain_road', 3300, 3, 'diamonds', 45],
  ['tanahun_hills', 'Tanahun Hills', 'Tanahun', 'hills', 'rolling_hills', 3400, 3, 'coins', 1200],
  ['bp_highway', 'BP Highway', 'Banepa to Bardibas', 'highway', 'mountain_road', 3700, 4, 'diamonds', 50],
  ['sindhuli', 'Sindhuli Road', 'Sindhuli', 'hills', 'steep_hills', 3500, 4, 'coins', 1350],
  ['khurkot', 'Khurkot Crossing', 'Ramechhap', 'river', 'valley', 3400, 3, 'coins', 1400],
  ['bardibas', 'Bardibas Plains', 'Mahottari', 'terai', 'flat', 2900, 2, 'coins', 1450],
  ['janakpur', 'Janakpur Roads', 'Dhanusha', 'urban', 'flat', 2800, 2, 'diamonds', 55],
  ['birgunj', 'Birgunj Gateway', 'Parsa', 'terai', 'flat', 3000, 2, 'coins', 1550],
  ['biratnagar', 'Biratnagar Streets', 'Morang', 'urban', 'flat', 3100, 2, 'coins', 1600],
  ['itahari', 'Itahari Junction', 'Sunsari', 'highway', 'flat', 3200, 2, 'diamonds', 60],
  ['dharan', 'Dharan Foothills', 'Sunsari', 'hills', 'rolling_hills', 3300, 3, 'coins', 1700],
  ['dhankuta', 'Dhankuta Hills', 'Dhankuta', 'hills', 'steep_hills', 3500, 4, 'coins', 1750],
  ['ilam', 'Ilam Tea Road', 'Ilam', 'tea_farm', 'rolling_hills', 3400, 3, 'diamonds', 65],
  ['kanyam', 'Kanyam Tea Garden', 'Ilam', 'tea_farm', 'valley', 3000, 3, 'coins', 1850],
  ['birtamod', 'Birtamod Highway', 'Jhapa', 'terai', 'flat', 2900, 2, 'coins', 1900],
  ['lumbini', 'Lumbini Plains', 'Rupandehi', 'terai', 'flat', 2800, 2, 'diamonds', 70],
  ['butwal', 'Butwal Gateway', 'Rupandehi', 'urban', 'rolling_hills', 3100, 3, 'coins', 2050],
  ['palpa', 'Palpa Ridge', 'Palpa', 'hills', 'steep_hills', 3600, 4, 'coins', 2100],
  ['tansen', 'Tansen Road', 'Palpa', 'hills', 'mountain_road', 3500, 4, 'diamonds', 75],
  ['beni', 'Beni River Road', 'Myagdi', 'river', 'valley', 3700, 4, 'coins', 2250],
  ['jomsom', 'Jomsom Trail', 'Mustang', 'dry_mountain', 'rocky', 3900, 5, 'diamonds', 80],
  ['mustang', 'Mustang Desert Road', 'Mustang', 'dry_mountain', 'rocky', 4000, 5, 'coins', 2400],
  ['kagbeni', 'Kagbeni Valley', 'Mustang', 'dry_mountain', 'valley', 4100, 5, 'diamonds', 85],
  ['manang', 'Manang Mountain Road', 'Manang', 'snow_mountain', 'rocky', 4200, 5, 'coins', 2600],
  ['annapurna_mountain_road', 'Annapurna Mountain Road', 'Annapurna', 'snow_mountain', 'mountain_road', 4400, 5, 'diamonds', 90],
  ['karnali_highway', 'Karnali Highway', 'Karnali', 'mountain', 'rocky', 4500, 5, 'coins', 2800],
  ['jumla', 'Jumla Road', 'Jumla', 'mountain', 'steep_hills', 4600, 5, 'diamonds', 95]
];

const existingStageAssets = new Set(['ktm_valley', 'ew_highway', 'pokhara_hills', 'mustang_road', 'himalayan_route']);
const themes = {
  valley: ['#87ceeb', '#4a7c59', '#8b4513', '#6b8e23', '#228b22'],
  urban: ['#87ceeb', '#556b2f', '#696969', '#808080', '#daa520'],
  hills: ['#87ceeb', '#2e8b57', '#8fbc8f', '#4682b4', '#32cd32'],
  highway: ['#87ceeb', '#556b2f', '#696969', '#808080', '#daa520'],
  fast_track: ['#9bd7ef', '#527a55', '#555b61', '#6f7f8a', '#d9a441'],
  terai: ['#f5d08a', '#6b8e23', '#a0522d', '#b8860b', '#daa520'],
  dry_mountain: ['#ffb36b', '#8b4513', '#a0522d', '#cd853f', '#d2691e'],
  snow_mountain: ['#b0e0e6', '#f0f8ff', '#e0ffff', '#708090', '#00ced1'],
  mountain: ['#b0e0e6', '#708090', '#696969', '#778899', '#00ced1']
};

function createStage([id, name, location, environment, profile, distance, difficulty, unlockType, unlockAmount]) {
  const colors = themes[environment] || themes.hills;
  const assetName = existingStageAssets.has(id) ? `${id}.svg` : null;
  const thumbnail = assetName ? `/assets/images/stages/${assetName}` : null;
  const background = assetName ? `/assets/images/backgrounds/${assetName}` : null;
  const stage = {
    id, name, location, description: `${name}, a gameplay-inspired route through ${location}.`, type: 'normal',
    assets: { preview: thumbnail, background }, unlocked: unlockType === 'free', cost: unlockAmount, currency: unlockType === 'diamonds' ? 'diamonds' : 'coins',
    targetDistance: distance, distance, environment,
    terrain: { profile, segmentWidth: 100, minHeight: 20 + difficulty * 10, maxHeight: 60 + difficulty * 25, jumpChance: Math.min(0.2, difficulty * 0.025), valleyChance: Math.min(0.35, 0.1 + difficulty * 0.04) },
    physics: { gravity: 980 }, collectibles: { coinChance: 0.7, fuelChance: 0.2, diamondChance: 0.1 },
    thumbnail, theme: { skyColor: colors[0], hillColor: colors[1], groundColor: colors[2], mountainColor: colors[3], accentColor: colors[4] }, difficulty,
    unlock: { type: unlockType, amount: unlockAmount }
  };
  if (id === 'ktm_nijgadh_fast_track') {
    stage.terrain.sections = [
      'expressway_straight',
      'climbing_section',
      'downhill_section',
      'bridge',
      'tunnel_entrance',
      'tunnel_interior',
      'tunnel_exit',
      'valley_section',
      'terai_transition',
      'nijgadh_finish'
    ];
  }
  return stage;
}

export const stages = stageSpecs.map(createStage);
