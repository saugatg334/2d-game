// ============================================
// Nepali Racer - Default Player Data
// ============================================

// F6: single source of truth for the save-data schema version. Lives here (not
// in SaveSystem) to avoid a circular import; SaveSystem imports it for the
// migration hook and stamps it on every save.
export const CURRENT_SAVE_VERSION = 1;

export const defaultPlayerData = {
  schemaVersion: CURRENT_SAVE_VERSION,

  coins: 0,
  diamonds: 0,

  unlockedCharacters: ['default_rider'],
  unlockedVehicles: ['tempo'],
  unlockedStages: ['ktm_valley'],

  selectedCharacter: 'default_rider',
  selectedVehicle: 'tempo',
  selectedStage: 'ktm_valley',

  bestDistance: 0,
  bestScore: 0,
  completedStages: [],

  settings: {
    sound: true,
    music: true,
    vibration: true,
    debugMode: false
  }
};
