// ============================================
// Nepali Racer - Character Data
// ============================================

const characterSpecs = [
  ['default_rider', 'Default Rider', 'rider', 'All Nepal', 70, 1, 0, 'free', 0, 'default_rider.svg'],
  ['explorer', 'Explorer', 'explorer', 'Himalayan region', 75, 1.1, 10, 'diamonds', 0.05, 'explorer.svg'],
  ['mountain_rider', 'Mountain Rider', 'rider', 'Hill region', 80, 1.2, 500, 'coins', 0, 'mountain_rider.svg'],
  ['ktm_rider', 'Kathmandu Rider', 'rider', 'Kathmandu Valley', 65, 1.3, 20, 'diamonds', 0, 'ktm_rider.svg'],
  ['prabin', 'Prabin', 'rider', 'Bagmati', 72, 1.05, 100, 'coins', 0.02, 'prabin.svg'],
  ['sushmita', 'Sushmita', 'rider', 'Gandaki', 68, 1.12, 120, 'coins', 0.03, 'sushmita.svg'],
  ['rojina', 'Rojina', 'rider', 'Koshi', 66, 1.18, 150, 'coins', 0.02, 'rojina.svg'],
  ['bikash', 'Bikash', 'mechanic', 'Lumbini', 78, 1.08, 180, 'coins', 0.04, 'bikash.svg'],
  ['aayush', 'Aayush', 'student', 'Bagmati', 64, 1.2, 8, 'diamonds', 0.01, 'aayush.svg'],
  ['nischal', 'Nischal', 'rider', 'Gandaki', 70, 1.15, 200, 'coins', 0.03, 'nischal.svg'],
  ['samir', 'Samir', 'delivery', 'Madhesh', 74, 1.1, 220, 'coins', 0.04, 'samir.svg'],
  ['binita', 'Binita', 'rider', 'Karnali', 67, 1.22, 12, 'diamonds', 0.02, 'binita.svg'],
  ['anisha', 'Anisha', 'student', 'Koshi', 63, 1.25, 250, 'coins', 0.02, 'anisha.svg'],
  ['roshan', 'Roshan', 'mechanic', 'Lumbini', 79, 1.06, 260, 'coins', 0.05, 'roshan.svg'],
  ['sabin', 'Sabin', 'rider', 'Sudurpashchim', 76, 1.09, 280, 'coins', 0.03, 'sabin.svg'],
  ['pujan', 'Pujan', 'farmer', 'Madhesh', 82, 1.02, 300, 'coins', 0.06, 'pujan.svg'],
  ['saroj', 'Saroj', 'rider', 'Koshi', 71, 1.14, 15, 'diamonds', 0.03, 'saroj.svg'],
  ['manish', 'Manish', 'rider', 'Gandaki', 73, 1.16, 320, 'coins', 0.02, 'manish.svg'],
  ['kritika', 'Kritika', 'rider', 'Bagmati', 62, 1.28, 18, 'diamonds', 0.02, 'kritika.svg'],
  ['aastha', 'Aastha', 'tourist', 'Kathmandu Valley', 69, 1.18, 350, 'coins', 0.04, 'aastha.svg'],
  ['ramesh', 'Ramesh', 'farmer', 'Lumbini', 84, 1.01, 380, 'coins', 0.05, 'ramesh.svg'],
  ['milan', 'Milan', 'rider', 'Karnali', 77, 1.1, 22, 'diamonds', 0.03, 'milan.svg'],
  ['sandesh', 'Sandesh', 'mechanic', 'Koshi', 80, 1.07, 400, 'coins', 0.06, 'sandesh.svg'],
  ['saugat_legendary', 'Saugat', 'special', 'Nepal / Nijgadh', 60, 1.25, 50000, 'coins', 0.25, 'saugat_legendary.svg'],
  ['dipesh', 'Dipesh', 'rider', 'Madhesh', 75, 1.13, 420, 'coins', 0.03, 'dipesh.svg'],
  ['sarita', 'Sarita', 'rider', 'Sudurpashchim', 68, 1.2, 25, 'diamonds', 0.03, 'sarita.svg'],
  ['nabin', 'Nabin', 'delivery', 'Bagmati', 72, 1.17, 450, 'coins', 0.04, 'nabin.svg'],
  ['mamata', 'Mamata', 'rider', 'Gandaki', 65, 1.23, 28, 'diamonds', 0.02, 'mamata.svg'],
  ['kiran', 'Kiran', 'rider', 'Koshi', 70, 1.19, 480, 'coins', 0.03, 'kiran.svg'],
  ['sunita', 'Sunita', 'farmer', 'Madhesh', 81, 1.04, 30, 'diamonds', 0.05, 'sunita.svg'],
  ['dipak', 'Dipak', 'mechanic', 'Lumbini', 83, 1.05, 520, 'coins', 0.06, 'dipak.svg'],
  ['manju', 'Manju', 'rider', 'Karnali', 66, 1.24, 35, 'diamonds', 0.03, 'manju.svg'],
  ['ashish', 'Ashish', 'racer', 'Bagmati', 69, 1.27, 550, 'coins', 0.04, 'ashish.svg'],
  ['gita', 'Gita', 'rider', 'Koshi', 64, 1.21, 38, 'diamonds', 0.03, 'gita.svg'],
  ['hari', 'Hari', 'farmer', 'Gandaki', 86, 1, 580, 'coins', 0.07, 'hari.svg'],
  ['laxmi', 'Laxmi', 'rider', 'Madhesh', 67, 1.2, 40, 'diamonds', 0.04, 'laxmi.svg'],
  ['suman', 'Suman', 'delivery', 'Kathmandu Valley', 73, 1.16, 600, 'coins', 0.05, 'suman.svg'],
  ['rekha', 'Rekha', 'rider', 'Lumbini', 70, 1.18, 45, 'diamonds', 0.03, 'rekha.svg'],
  ['suraj', 'Suraj', 'rider', 'Sudurpashchim', 78, 1.1, 620, 'coins', 0.04, 'suraj.svg'],
  ['puja', 'Puja', 'student', 'Bagmati', 61, 1.29, 48, 'diamonds', 0.02, 'puja.svg'],
  ['abinash', 'Abinash', 'mechanic', 'Karnali', 82, 1.06, 650, 'coins', 0.06, 'abinash.svg'],
  ['nirmala', 'Nirmala', 'rider', 'Koshi', 69, 1.22, 52, 'diamonds', 0.04, 'nirmala.svg'],
  ['deepak', 'Deepak', 'rider', 'Gandaki', 74, 1.15, 680, 'coins', 0.05, 'deepak.svg'],
  ['srijana', 'Srijana', 'rider', 'Madhesh', 63, 1.26, 55, 'diamonds', 0.03, 'srijana.svg'],
  ['narayan', 'Narayan', 'farmer', 'Lumbini', 88, 0.98, 700, 'coins', 0.08, 'narayan.svg'],
  ['asmita', 'Asmita', 'rider', 'Sudurpashchim', 65, 1.24, 58, 'diamonds', 0.04, 'asmita.svg'],
  ['bimal', 'Bimal', 'racer', 'Kathmandu Valley', 71, 1.28, 750, 'coins', 0.06, 'bimal.svg'],
  ['saraswati', 'Saraswati', 'rider', 'Karnali', 68, 1.2, 60, 'diamonds', 0.05, 'saraswati.svg'],
  ['lalit', 'Lalit', 'mechanic', 'Bagmati', 79, 1.11, 800, 'coins', 0.07, 'lalit.svg'],
  ['maya', 'Maya', 'rider', 'Gandaki', 66, 1.25, 65, 'diamonds', 0.04, 'maya.svg']
];

function createCharacter([id, name, category, region, weight, handling, amount, type, fuelEfficiency = 0, asset]) {
  const thumbnail = asset ? `/assets/images/characters/${asset}` : null;
  // NOTE (P3 Step 10): `stats.weight`, `bonuses.stability` and
  // `bonuses.coinMultiplier` are data-only and intentionally NOT wired into
  // gameplay — applying weight/stability would alter physics, and
  // coinMultiplier would alter reward behavior. They are kept as inert data.
  const character = {
    id, name, description: `${name}, a Nepali ${category} ready for the road.`, category, region,
    assets: { thumbnail, sprite: thumbnail }, unlock: { type, amount },
    unlocked: type === 'free', cost: amount, currency: type === 'diamonds' ? 'diamonds' : 'coins', thumbnail,
    stats: { weight, handling }, bonuses: { fuelEfficiency, coinMultiplier: 0, stability: Math.max(0, handling - 1) }
  };
  if (id === 'saugat_legendary') {
    character.rarity = 'legendary';
    character.bonuses = {
      acceleration: 0.25,
      maxSpeed: 0.2,
      handling: 0,
      airControl: 0.3,
      fuelEfficiency: 0.25,
      // coinBonus is the LIVE reward modifier (read in GameScene);
      // coinMultiplier below is currently UNUSED — do not change the reward calc.
      coinBonus: 0.15,
      coinMultiplier: 0,
      stability: 0.25
    };
    // P0 Step 6H: ability tuning is now data-driven (previously hardcoded in
    // GameScene as duration 8 + boost literals). Values are exact parity with
    // the old runtime behavior; resolveCharacterAbility() in
    // src/game/CharacterAbility.js reads these with safe fallbacks.
    // NOTE: boosts.fuelEfficiency/coinBonus are intentionally NOT included —
    // Vehicle.applyAbilityBoosts has always ignored them, so they stay dead.
    character.specialAbility = {
      id: 'legendary_rider',
      name: 'Legendary Rider',
      description: 'Temporarily boosts speed, fuel efficiency and coin collection.',
      cooldown: 45,
      duration: 8,
      boosts: {
        acceleration: 0.5,
        maxSpeed: 0.4,
        airControl: 0.3
      }
    };
  }
  return character;
}

export const characters = characterSpecs.map(createCharacter);
