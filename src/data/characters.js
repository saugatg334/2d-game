// ============================================
// Nepali Racer - Character Data
// ============================================

const characterSpecs = [
  ['default_rider', 'Default Rider', 'rider', 'All Nepal', 70, 1, 0, 'free', 0, 'default_rider.svg'],
  ['explorer', 'Explorer', 'explorer', 'Himalayan region', 75, 1.1, 10, 'diamonds', 0.05, 'explorer.svg'],
  ['mountain_rider', 'Mountain Rider', 'rider', 'Hill region', 80, 1.2, 500, 'coins', 0, 'mountain_rider.svg'],
  ['ktm_rider', 'Kathmandu Rider', 'rider', 'Kathmandu Valley', 65, 1.3, 20, 'diamonds', 0, 'ktm_rider.svg'],
  ['prabin', 'Prabin', 'rider', 'Bagmati', 72, 1.05, 100, 'coins', 0.02],
  ['sushmita', 'Sushmita', 'rider', 'Gandaki', 68, 1.12, 120, 'coins', 0.03],
  ['rojina', 'Rojina', 'rider', 'Koshi', 66, 1.18, 150, 'coins', 0.02],
  ['bikash', 'Bikash', 'mechanic', 'Lumbini', 78, 1.08, 180, 'coins', 0.04],
  ['aayush', 'Aayush', 'student', 'Bagmati', 64, 1.2, 8, 'diamonds', 0.01],
  ['nischal', 'Nischal', 'rider', 'Gandaki', 70, 1.15, 200, 'coins', 0.03],
  ['samir', 'Samir', 'delivery', 'Madhesh', 74, 1.1, 220, 'coins', 0.04],
  ['binita', 'Binita', 'rider', 'Karnali', 67, 1.22, 12, 'diamonds', 0.02],
  ['anisha', 'Anisha', 'student', 'Koshi', 63, 1.25, 250, 'coins', 0.02],
  ['roshan', 'Roshan', 'mechanic', 'Lumbini', 79, 1.06, 260, 'coins', 0.05],
  ['sabin', 'Sabin', 'rider', 'Sudurpashchim', 76, 1.09, 280, 'coins', 0.03],
  ['pujan', 'Pujan', 'farmer', 'Madhesh', 82, 1.02, 300, 'coins', 0.06],
  ['saroj', 'Saroj', 'rider', 'Koshi', 71, 1.14, 15, 'diamonds', 0.03],
  ['manish', 'Manish', 'rider', 'Gandaki', 73, 1.16, 320, 'coins', 0.02],
  ['kritika', 'Kritika', 'rider', 'Bagmati', 62, 1.28, 18, 'diamonds', 0.02],
  ['aastha', 'Aastha', 'tourist', 'Kathmandu Valley', 69, 1.18, 350, 'coins', 0.04],
  ['ramesh', 'Ramesh', 'farmer', 'Lumbini', 84, 1.01, 380, 'coins', 0.05],
  ['milan', 'Milan', 'rider', 'Karnali', 77, 1.1, 22, 'diamonds', 0.03],
  ['sandesh', 'Sandesh', 'mechanic', 'Koshi', 80, 1.07, 400, 'coins', 0.06],
  ['saugat_legendary', 'Saugat', 'special', 'Nepal / Nijgadh', 60, 1.25, 50000, 'coins', 0.25, 'saugat_legendary.svg'],
  ['dipesh', 'Dipesh', 'rider', 'Madhesh', 75, 1.13, 420, 'coins', 0.03],
  ['sarita', 'Sarita', 'rider', 'Sudurpashchim', 68, 1.2, 25, 'diamonds', 0.03],
  ['nabin', 'Nabin', 'delivery', 'Bagmati', 72, 1.17, 450, 'coins', 0.04],
  ['mamata', 'Mamata', 'rider', 'Gandaki', 65, 1.23, 28, 'diamonds', 0.02],
  ['kiran', 'Kiran', 'rider', 'Koshi', 70, 1.19, 480, 'coins', 0.03],
  ['sunita', 'Sunita', 'farmer', 'Madhesh', 81, 1.04, 30, 'diamonds', 0.05],
  ['dipak', 'Dipak', 'mechanic', 'Lumbini', 83, 1.05, 520, 'coins', 0.06],
  ['manju', 'Manju', 'rider', 'Karnali', 66, 1.24, 35, 'diamonds', 0.03],
  ['ashish', 'Ashish', 'racer', 'Bagmati', 69, 1.27, 550, 'coins', 0.04],
  ['gita', 'Gita', 'rider', 'Koshi', 64, 1.21, 38, 'diamonds', 0.03],
  ['hari', 'Hari', 'farmer', 'Gandaki', 86, 1, 580, 'coins', 0.07],
  ['laxmi', 'Laxmi', 'rider', 'Madhesh', 67, 1.2, 40, 'diamonds', 0.04],
  ['suman', 'Suman', 'delivery', 'Kathmandu Valley', 73, 1.16, 600, 'coins', 0.05],
  ['rekha', 'Rekha', 'rider', 'Lumbini', 70, 1.18, 45, 'diamonds', 0.03],
  ['suraj', 'Suraj', 'rider', 'Sudurpashchim', 78, 1.1, 620, 'coins', 0.04],
  ['puja', 'Puja', 'student', 'Bagmati', 61, 1.29, 48, 'diamonds', 0.02],
  ['abinash', 'Abinash', 'mechanic', 'Karnali', 82, 1.06, 650, 'coins', 0.06],
  ['nirmala', 'Nirmala', 'rider', 'Koshi', 69, 1.22, 52, 'diamonds', 0.04],
  ['deepak', 'Deepak', 'rider', 'Gandaki', 74, 1.15, 680, 'coins', 0.05],
  ['srijana', 'Srijana', 'rider', 'Madhesh', 63, 1.26, 55, 'diamonds', 0.03],
  ['narayan', 'Narayan', 'farmer', 'Lumbini', 88, 0.98, 700, 'coins', 0.08],
  ['asmita', 'Asmita', 'rider', 'Sudurpashchim', 65, 1.24, 58, 'diamonds', 0.04],
  ['bimal', 'Bimal', 'racer', 'Kathmandu Valley', 71, 1.28, 750, 'coins', 0.06],
  ['saraswati', 'Saraswati', 'rider', 'Karnali', 68, 1.2, 60, 'diamonds', 0.05],
  ['lalit', 'Lalit', 'mechanic', 'Bagmati', 79, 1.11, 800, 'coins', 0.07],
  ['maya', 'Maya', 'rider', 'Gandaki', 66, 1.25, 65, 'diamonds', 0.04]
];

function createCharacter([id, name, category, region, weight, handling, amount, type, fuelEfficiency = 0, asset]) {
  const thumbnail = asset ? `/assets/images/characters/${asset}` : null;
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
      coinBonus: 0.15,
      coinMultiplier: 0,
      stability: 0.25
    };
    character.specialAbility = {
      id: 'legendary_rider',
      name: 'Legendary Rider',
      description: 'Temporarily boosts speed, fuel efficiency and coin collection.',
      cooldown: 45
    };
  }
  return character;
}

export const characters = characterSpecs.map(createCharacter);
