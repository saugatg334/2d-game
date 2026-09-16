// ============================================
// Nepali Racer - Save System
// ============================================

import { SAVE_KEY } from '../config/constants.js';
import { defaultPlayerData } from '../data/playerData.js';

class SaveSystem {
  constructor() {
    this.data = this.load();
  }

  load() {
    let data = { ...defaultPlayerData };
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        data = { ...defaultPlayerData, ...parsed };
      }
    } catch (e) {
      console.warn('SaveSystem: Failed to load save data, using defaults.', e);
    }
    // F1: normalize corrupted/legacy fields before anything reads them.
    this.sanitizeSaveData(data);
    // Development-only: unlock legendary characters and Fast Track stage for local testing
    // This does NOT affect production builds (import.meta.env.DEV is false in production)
    if (import.meta.env.DEV) {
      if (!data.unlockedCharacters.includes('saugat_legendary')) {
        data.unlockedCharacters = [...data.unlockedCharacters, 'saugat_legendary'];
      }
      if (!data.unlockedStages.includes('ktm_nijgadh_fast_track')) {
        data.unlockedStages = [...data.unlockedStages, 'ktm_nijgadh_fast_track'];
      }
    }
    return data;
  }

  // Normalize corrupted/legacy save fields after parsing and merging with
  // defaults, so wrong-typed localStorage values can never crash the game.
  // Repairs in place, keeps every valid value, changes no save structure.
  sanitizeSaveData(data) {
    const isPlainObject = (v) =>
      typeof v === 'object' && v !== null && !Array.isArray(v);
    const toFiniteNumber = (v, fallback) =>
      typeof v === 'number' && Number.isFinite(v) ? v : fallback;
    const toIdString = (v, fallback) =>
      typeof v === 'string' && v.trim() !== '' ? v : fallback;
    const toIdArray = (v, fallback) =>
      Array.isArray(v) ? v.filter((id) => typeof id === 'string') : [...fallback];

    // Arrays: non-arrays are replaced by the corresponding default array;
    // valid arrays keep only string entries.
    data.unlockedCharacters = toIdArray(data.unlockedCharacters, defaultPlayerData.unlockedCharacters);
    data.unlockedVehicles = toIdArray(data.unlockedVehicles, defaultPlayerData.unlockedVehicles);
    data.unlockedStages = toIdArray(data.unlockedStages, defaultPlayerData.unlockedStages);
    data.completedStages = toIdArray(data.completedStages, defaultPlayerData.completedStages);

    // Numeric fields: invalid/non-finite/non-numeric values fall back to the
    // default, so NaN can never persist.
    data.coins = toFiniteNumber(data.coins, defaultPlayerData.coins);
    data.diamonds = toFiniteNumber(data.diamonds, defaultPlayerData.diamonds);
    data.bestDistance = toFiniteNumber(data.bestDistance, defaultPlayerData.bestDistance);
    data.bestScore = toFiniteNumber(data.bestScore, defaultPlayerData.bestScore);

    // Selection fields: non-string/empty values fall back to the default.
    data.selectedCharacter = toIdString(data.selectedCharacter, defaultPlayerData.selectedCharacter);
    data.selectedVehicle = toIdString(data.selectedVehicle, defaultPlayerData.selectedVehicle);
    data.selectedStage = toIdString(data.selectedStage, defaultPlayerData.selectedStage);

    // Settings: missing/null/non-object settings fall back to a copy of the
    // defaults; a valid object keeps its individual values untouched.
    if (!isPlainObject(data.settings)) {
      data.settings = { ...defaultPlayerData.settings };
    }
    return data;
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
      return true;
    } catch (e) {
      console.error('SaveSystem: Failed to save data.', e);
      return false;
    }
  }

  reset() {
    this.data = { ...defaultPlayerData };
    this.save();
  }

  // Currency
  getCoins() {
    return this.data.coins;
  }

  getDiamonds() {
    return this.data.diamonds;
  }

  // F4: guard the write path — a non-finite/non-numeric stored value (or a
  // bad increment) must never poison arithmetic or persist NaN/Infinity.
  toSafeNumber(value) {
    return Number.isFinite(value) ? value : 0;
  }

  addCoins(amount) {
    this.data.coins = this.toSafeNumber(this.data.coins) + this.toSafeNumber(amount);
    this.save();
  }

  addDiamonds(amount) {
    this.data.diamonds = this.toSafeNumber(this.data.diamonds) + this.toSafeNumber(amount);
    this.save();
  }

  spendCoins(amount) {
    if (this.data.coins >= amount) {
      this.data.coins -= amount;
      this.save();
      return true;
    }
    return false;
  }

  spendDiamonds(amount) {
    if (this.data.diamonds >= amount) {
      this.data.diamonds -= amount;
      this.save();
      return true;
    }
    return false;
  }

  // Unlocks
  isCharacterUnlocked(id) {
    return this.data.unlockedCharacters.includes(id);
  }

  isVehicleUnlocked(id) {
    return this.data.unlockedVehicles.includes(id);
  }

  isStageUnlocked(id) {
    if (import.meta.env.DEV && id === 'ktm_nijgadh_fast_track') {
      return true;
    }
    return this.data.unlockedStages.includes(id);
  }

  unlockCharacter(id) {
    if (!this.data.unlockedCharacters.includes(id)) {
      this.data.unlockedCharacters.push(id);
      this.save();
    }
  }

  unlockVehicle(id) {
    if (!this.data.unlockedVehicles.includes(id)) {
      this.data.unlockedVehicles.push(id);
      this.save();
    }
  }

  unlockStage(id) {
    if (!this.data.unlockedStages.includes(id)) {
      this.data.unlockedStages.push(id);
      this.save();
    }
  }

  // Selections
  getSelectedCharacter() {
    return this.data.selectedCharacter;
  }

  getSelectedVehicle() {
    return this.data.selectedVehicle;
  }

  getSelectedStage() {
    return this.data.selectedStage;
  }

  setSelectedCharacter(id) {
    this.data.selectedCharacter = id;
    this.save();
  }

  setSelectedVehicle(id) {
    this.data.selectedVehicle = id;
    this.save();
  }

  setSelectedStage(id) {
    this.data.selectedStage = id;
    this.save();
  }

  // Progress
  getBestDistance() {
    return this.data.bestDistance;
  }

  getBestScore() {
    return this.data.bestScore;
  }

  updateBestDistance(distance) {
    // F4: normalize a corrupted stored value before comparing; reject
    // non-finite incoming values so NaN/Infinity can never persist.
    if (!Number.isFinite(this.data.bestDistance)) this.data.bestDistance = 0;
    if (Number.isFinite(distance) && distance > this.data.bestDistance) {
      this.data.bestDistance = distance;
      this.save();
      return true;
    }
    return false;
  }

  updateBestScore(score) {
    if (!Number.isFinite(this.data.bestScore)) this.data.bestScore = 0;
    if (Number.isFinite(score) && score > this.data.bestScore) {
      this.data.bestScore = score;
      this.save();
      return true;
    }
    return false;
  }

  completeStage(stageId) {
    if (!this.data.completedStages.includes(stageId)) {
      this.data.completedStages.push(stageId);
      this.save();
    }
  }

  isStageCompleted(stageId) {
    return this.data.completedStages.includes(stageId);
  }

  // Settings
  getSetting(key) {
    return this.data.settings[key];
  }

  setSetting(key, value) {
    // F3: settings must be a plain object before writing; corrupted/legacy
    // values are replaced by a copy of the defaults.
    if (!this.data.settings || typeof this.data.settings !== 'object' || Array.isArray(this.data.settings)) {
      this.data.settings = { ...defaultPlayerData.settings };
    }
    this.data.settings[key] = value;
    this.save();
  }

  getSettings() {
    return { ...this.data.settings };
  }
}

export const saveSystem = new SaveSystem();
export default SaveSystem;
