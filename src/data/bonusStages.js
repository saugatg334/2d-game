// ============================================
// Nepali Racer - Bonus Stage Data
// ============================================

export const bonusStages = [
  {
    id: 'moon_bonus',
    name: 'Moon Bonus',
    description: 'A low-gravity crater run beyond Nepal.',
    type: 'bonus',
    assets: {
      preview: null,
      background: null
    },
    terrain: {
      profile: 'moon_craters'
    },
    physics: {
      gravity: 160
    }
  }
];

export default bonusStages;
