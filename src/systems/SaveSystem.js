// ============================================
// Nepali Racer - Save System
// ============================================

import { SAVE_KEY } from '../config/constants.js';
import { defaultPlayerData, CURRENT_SAVE_VERSION } from '../data/playerData.js';

class SaveSystem {
  constructor() {
    this.data = this.load();
  }

  load() {
    let parsed = {};
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        parsed = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('SaveSystem: Failed to load save data, using defaults.', e);
      parsed = {};
    }
    // F7: remember selection values exactly as loaded from disk, so a stale or
    // invalid saved ID can still be re-persisted even after F1 sanitization
    // has already repaired it in memory.
    this._loadedSelections = {
      selectedCharacter: parsed.selectedCharacter,
      selectedVehicle: parsed.selectedVehicle,
      selectedStage: parsed.selectedStage,
    };
    // F6: migrate legacy/future save structures BEFORE merging with defaults so
    // the migration hook always sees the raw saved shape (a missing
    // schemaVersion would otherwise be masked by the default's value).
    parsed = this.migrateSaveData(parsed);
    let data = { ...defaultPlayerData, ...parsed };
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

  // F6: Backward-compatible migration hook. Runs BEFORE merge-with-defaults and
  // sanitization. Determines the save's schema version safely (missing/invalid
  // = legacy save that can be migrated) and migrates older versions toward
  // CURRENT_SAVE_VERSION step by step.
  // - Unknown FUTURE versions (data written by a newer build) are kept intact:
  //   no downgrade, no field destruction — sanitization still handles unsafe fields.
  // - Version 1 has no prior structural migration, so this performs NO
  //   destructive field changes today.
  // - Safe for malformed/non-object input (returned untouched).
  migrateSaveData(data) {
    if (data === null || typeof data !== 'object') return data;
    const v = data.schemaVersion;
    const version =
      typeof v === 'number' && Number.isFinite(v) && v >= 0
        ? Math.floor(v)
        : 0; // missing/invalid => legacy save that can be migrated
    if (version >= CURRENT_SAVE_VERSION) return data; // v1 (or future): keep as-is
    // Stepwise migrations: 0 -> 1. Add future steps below as needed.
    if (version < 1) {
      data.schemaVersion = 1;
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
      // F6: stamp the current schema version so every persisted save is
      // self-describing; existing valid saves gain schemaVersion on first save.
      if (this.data && typeof this.data === 'object') {
        this.data.schemaVersion = CURRENT_SAVE_VERSION;
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
      // F7: disk now mirrors memory — mark selections as persisted so fallback
      // persistence never re-saves an already-corrected value.
      if (this._loadedSelections) {
        this._loadedSelections.selectedCharacter = this.data.selectedCharacter;
        this._loadedSelections.selectedVehicle = this.data.selectedVehicle;
        this._loadedSelections.selectedStage = this.data.selectedStage;
      }
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

  // F7: persist a selection after a scene resolved a stale/invalid saved ID to
  // its valid fallback. Called once per scene create (never per frame/render).
  // A valid saved ID matches both memory and the disk-loaded value and returns
  // without saving; a stale/invalid saved value is corrected and saved once.
  persistSelectionIfStale(field, resolvedId) {
    if (typeof resolvedId !== 'string' || resolvedId === '') return false;
    const loaded = this._loadedSelections ? this._loadedSelections[field] : undefined;
    if (this.data[field] === resolvedId && loaded === resolvedId) return false;
    this.data[field] = resolvedId;
    if (this._loadedSelections) this._loadedSelections[field] = resolvedId;
    this.save();
    return true;
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
