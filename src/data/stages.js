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
  ['ktm_nijgadh_fast_track', 'Kathmandu–Nijgadh Fast Track', 'Khokana → Nijgadh', 'fast_track', 'expressway', 2500, 3, 'diamonds', 20],
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

const existingStageAssets = new Set(['ktm_valley', 'ew_highway', 'pokhara_hills', 'mustang_road', 'himalayan_route', 'ktm_nijgadh_fast_track', 'nijgadh_fast_track', 'khokana', 'nijgadh_hetauda', 'hetauda_hills', 'tribhuvan_highway', 'prithvi_highway', 'bp_highway', 'karnali_highway', 'muglin_road', 'kathmandu_pokhara', 'makwanpur_hills', 'pokhara_valley', 'sarangkot', 'tanahun_hills', 'gorkha', 'bandipur', 'sindhuli', 'dhankuta', 'palpa', 'tansen', 'chitwan', 'bardibas', 'birgunj', 'lumbini', 'birtamod', 'narayangadh', 'narayangadh_muglin', 'khurkot', 'beni', 'begnas', 'bharatpur', 'janakpur', 'biratnagar', 'butwal', 'ilam', 'kanyam', 'dharan', 'itahari', 'jomsom', 'mustang', 'kagbeni', 'manang', 'annapurna_mountain_road', 'jumla']);
const themes = {
  valley: ['#87ceeb', '#4a7c59', '#8b4513', '#6b8e23', '#228b22'],
  urban: ['#87ceeb', '#556b2f', '#696969', '#808080', '#daa520'],
  hills: ['#87ceeb', '#2e8b57', '#8fbc8f', '#4682b4', '#32cd32'],
  highway: ['#87ceeb', '#556b2f', '#696969', '#808080', '#daa520'],
  fast_track: ['#85c1e9', '#1e8449', '#2c3e50', '#2980b9', '#f1c40f'],
  terai: ['#f5d08a', '#6b8e23', '#a0522d', '#b8860b', '#daa520'],
  dry_mountain: ['#ffb36b', '#8b4513', '#a0522d', '#cd853f', '#d2691e'],
  snow_mountain: ['#b0e0e6', '#f0f8ff', '#e0ffff', '#708090', '#00ced1'],
  mountain: ['#b0e0e6', '#708090', '#696969', '#778899', '#00ced1']
};

// P3 Step 6: Stage-specific collectible spawn chances (data only).
// Each of the 50 main stages declares its own coin/fuel/diamond spawn
// probabilities so the existing Terrain -> StagePlan -> Collectibles pipeline
// stays fully data-driven. Values are the independent chances consumed by
// Collectibles.generate() (cumulative thresholds are derived there).
// Reward VALUES are untouched and still live in Collectibles.js:
//   coin = 1, diamond = 1, fuel = 25
// Balancing philosophy (variety, not an economy rebalance):
//   flat / plains ......... most coins, low fuel, normal diamonds
//   valley / river ........ coin-leaning, moderate fuel
//   rolling_hills ......... balanced, slightly more fuel than flat
//   expressway / Fast Track highest coin density, moderate fuel
//   steep_hills ........... more fuel, fewer coins (still very playable)
//   mountain_road ......... fuel-heavy to support long climbs
//   rocky / high mountain . most fuel, fewest coins
// Every stage's three chances sum to exactly 1, diamonds stay scarce
// everywhere, and the overall average stays close to the 70/20/10 baseline.
const DEFAULT_COLLECTIBLES = { coinChance: 0.7, fuelChance: 0.2, diamondChance: 0.1 };

const collectibleChances = {
  // --- flat / plains (easy, coin-dense) -------------------------------
  ew_highway:                 { coinChance: 0.77, fuelChance: 0.14, diamondChance: 0.09 },
  chitwan:                    { coinChance: 0.79, fuelChance: 0.12, diamondChance: 0.09 },
  narayangadh:                { coinChance: 0.76, fuelChance: 0.15, diamondChance: 0.09 },
  bharatpur:                  { coinChance: 0.78, fuelChance: 0.14, diamondChance: 0.08 },
  bardibas:                   { coinChance: 0.80, fuelChance: 0.12, diamondChance: 0.08 },
  janakpur:                   { coinChance: 0.78, fuelChance: 0.14, diamondChance: 0.08 },
  birgunj:                    { coinChance: 0.77, fuelChance: 0.15, diamondChance: 0.08 },
  biratnagar:                 { coinChance: 0.79, fuelChance: 0.13, diamondChance: 0.08 },
  itahari:                    { coinChance: 0.80, fuelChance: 0.12, diamondChance: 0.08 },
  birtamod:                   { coinChance: 0.76, fuelChance: 0.16, diamondChance: 0.08 },
  lumbini:                    { coinChance: 0.79, fuelChance: 0.13, diamondChance: 0.08 },

  // --- valley / river (coin-leaning) ----------------------------------
  khokana:                    { coinChance: 0.76, fuelChance: 0.16, diamondChance: 0.08 },
  muglin_road:                { coinChance: 0.72, fuelChance: 0.20, diamondChance: 0.08 },
  begnas:                     { coinChance: 0.75, fuelChance: 0.17, diamondChance: 0.08 },
  narayangadh_muglin:         { coinChance: 0.71, fuelChance: 0.20, diamondChance: 0.09 },
  khurkot:                    { coinChance: 0.73, fuelChance: 0.18, diamondChance: 0.09 },
  kanyam:                     { coinChance: 0.74, fuelChance: 0.17, diamondChance: 0.09 },
  beni:                       { coinChance: 0.70, fuelChance: 0.22, diamondChance: 0.08 },
  kagbeni:                    { coinChance: 0.70, fuelChance: 0.21, diamondChance: 0.09 },

  // --- rolling_hills (balanced) ---------------------------------------
  ktm_valley:                 { coinChance: 0.73, fuelChance: 0.19, diamondChance: 0.08 },
  pokhara_hills:              { coinChance: 0.71, fuelChance: 0.20, diamondChance: 0.09 },
  nijgadh_hetauda:            { coinChance: 0.72, fuelChance: 0.19, diamondChance: 0.09 },
  prithvi_highway:            { coinChance: 0.70, fuelChance: 0.21, diamondChance: 0.09 },
  pokhara_valley:             { coinChance: 0.72, fuelChance: 0.20, diamondChance: 0.08 },
  tanahun_hills:              { coinChance: 0.69, fuelChance: 0.22, diamondChance: 0.09 },
  dharan:                     { coinChance: 0.70, fuelChance: 0.20, diamondChance: 0.10 },
  ilam:                       { coinChance: 0.71, fuelChance: 0.21, diamondChance: 0.08 },
  butwal:                     { coinChance: 0.69, fuelChance: 0.21, diamondChance: 0.10 },

  // --- expressway / Fast Track (highest coin density) -----------------
  ktm_nijgadh_fast_track:     { coinChance: 0.79, fuelChance: 0.14, diamondChance: 0.07 },
  nijgadh_fast_track:         { coinChance: 0.78, fuelChance: 0.15, diamondChance: 0.07 },

  // --- steep_hills (fuel-leaning) -------------------------------------
  himalayan_route:            { coinChance: 0.64, fuelChance: 0.27, diamondChance: 0.09 },
  hetauda_hills:              { coinChance: 0.67, fuelChance: 0.24, diamondChance: 0.09 },
  makwanpur_hills:            { coinChance: 0.66, fuelChance: 0.25, diamondChance: 0.09 },
  sarangkot:                  { coinChance: 0.68, fuelChance: 0.23, diamondChance: 0.09 },
  gorkha:                     { coinChance: 0.67, fuelChance: 0.25, diamondChance: 0.08 },
  sindhuli:                   { coinChance: 0.65, fuelChance: 0.26, diamondChance: 0.09 },
  dhankuta:                   { coinChance: 0.64, fuelChance: 0.26, diamondChance: 0.10 },
  palpa:                      { coinChance: 0.65, fuelChance: 0.25, diamondChance: 0.10 },
  jumla:                      { coinChance: 0.62, fuelChance: 0.29, diamondChance: 0.09 },

  // --- mountain_road (fuel-heavy long climbs) -------------------------
  tribhuvan_highway:          { coinChance: 0.64, fuelChance: 0.27, diamondChance: 0.09 },
  kathmandu_pokhara:          { coinChance: 0.65, fuelChance: 0.26, diamondChance: 0.09 },
  bandipur:                   { coinChance: 0.63, fuelChance: 0.28, diamondChance: 0.09 },
  bp_highway:                 { coinChance: 0.61, fuelChance: 0.30, diamondChance: 0.09 },
  tansen:                     { coinChance: 0.62, fuelChance: 0.29, diamondChance: 0.09 },
  annapurna_mountain_road:    { coinChance: 0.60, fuelChance: 0.31, diamondChance: 0.09 },

  // --- rocky / dry mountain (most fuel, fewest coins) ------------------
  mustang_road:               { coinChance: 0.62, fuelChance: 0.29, diamondChance: 0.09 },
  jomsom:                     { coinChance: 0.58, fuelChance: 0.33, diamondChance: 0.09 },
  mustang:                    { coinChance: 0.59, fuelChance: 0.32, diamondChance: 0.09 },
  manang:                     { coinChance: 0.57, fuelChance: 0.34, diamondChance: 0.09 },
  karnali_highway:            { coinChance: 0.58, fuelChance: 0.32, diamondChance: 0.10 }
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
    physics: { gravity: 980 }, collectibles: { ...(collectibleChances[id] || DEFAULT_COLLECTIBLES) },
    thumbnail, theme: { skyColor: colors[0], hillColor: colors[1], groundColor: colors[2], mountainColor: colors[3], accentColor: colors[4] }, difficulty,
    unlock: { type: unlockType, amount: unlockAmount }
  };
  if (id === 'ktm_nijgadh_fast_track') {
    stage.description = "A gameplay representation inspired by Nepal's 72.5 km Kathmandu–Nijgadh Fast Track expressway project, connecting Khokana to Nijgadh through high-speed bridges, hill cuts, and twin tunnels.";
    stage.terrain.sections = [
      { name: 'valley_start', length: 250, profile: 'flat_start' },
      { name: 'hill_climb', length: 350, profile: 'gentle_up' },
      { name: 'expressway', length: 300, profile: 'gentle_rolling' },
      { name: 'bridge', length: 250, profile: 'level_bridge' },
      { name: 'tunnel_approach', length: 150, profile: 'gentle_down' },
      { name: 'tunnel', length: 300, profile: 'level_tunnel' },
      { name: 'tunnel_exit', length: 150, profile: 'gentle_up' },
      { name: 'hill_expressway', length: 300, profile: 'gentle_rolling' },
      { name: 'terai_transition', length: 300, profile: 'gentle_down' },
      { name: 'nijgadh_finish', length: 150, profile: 'flat_finish' }
    ];
  }
  if (id === 'nijgadh_fast_track') {
    stage.terrain.sections = [
      { name: 'valley_start', length: 250 },
      { name: 'hill_climb', length: 350 },
      { name: 'expressway', length: 300 },
      { name: 'bridge', length: 250 },
      { name: 'tunnel_approach', length: 150 },
      { name: 'tunnel', length: 300 },
      { name: 'tunnel_exit', length: 150 },
      { name: 'hill_expressway', length: 300 },
      { name: 'terai_transition', length: 300 },
      { name: 'nijgadh_finish', length: 150 },
      { name: 'hill_climb', length: 350 },
      { name: 'expressway', length: 300 },
      { name: 'bridge', length: 150 },
      { name: 'nijgadh_finish', length: 100 }
    ];
  }
  return stage;
}

export const stages = stageSpecs.map(createStage);
