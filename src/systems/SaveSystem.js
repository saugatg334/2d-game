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
    // Development-only: unlock legendary characters for local testing
    // This does NOT affect production builds (import.meta.env.DEV is false in production)
    if (import.meta.env.DEV && !data.unlockedCharacters.includes('saugat_legendary')) {
      data.unlockedCharacters = [...data.unlockedCharacters, 'saugat_legendary'];
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

  addCoins(amount) {
    this.data.coins += amount;
    this.save();
  }

  addDiamonds(amount) {
    this.data.diamonds += amount;
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
    if (distance > this.data.bestDistance) {
      this.data.bestDistance = distance;
      this.save();
      return true;
    }
    return false;
  }

  updateBestScore(score) {
    if (score > this.data.bestScore) {
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
    this.data.settings[key] = value;
    this.save();
  }

  getSettings() {
    return { ...this.data.settings };
  }
}

export const saveSystem = new SaveSystem();
export default SaveSystem;
