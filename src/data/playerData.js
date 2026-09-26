// ============================================
// Nepali Racer - Default Player Data
// ============================================

// F6: single source of truth for the save-data schema version. Lives here (not
// in SaveSystem) to avoid a circular import; SaveSystem imports it for the
// migration hook and stamps it on every save.
// v2 (Phase 1.7): bestDistance migrated from legacy world units to physical
// metres (legacy world units = metres x 3.6). See SaveSystem.migrateSaveData.
export const CURRENT_SAVE_VERSION = 2;

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
  bestRunCoins: 0,
  bestMilestone: 0,
  completedStages: [],

  settings: {
    sound: true,
    music: true,
    vibration: true,
    debugMode: false
  }
};
