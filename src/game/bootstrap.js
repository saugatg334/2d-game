// ============================================
// Nepali Racer - Game Bootstrap (Phase 1)
// ============================================
// Extracted verbatim from the former src/main.js so the Phaser boot can be
// invoked on demand (PLAY NOW / site layer) instead of always running on page
// load. Gameplay, configuration, scene order and data validation are
// unchanged — this module ONLY owns "how the game starts".

import Phaser from 'phaser';
import { gameConfig } from '../config/gameConfig.js';
import { LoadingScene } from '../scenes/LoadingScene.js';
import { MainMenuScene } from '../scenes/MainMenuScene.js';
import { CharacterSelectScene } from '../scenes/CharacterSelectScene.js';
import { VehicleSelectScene } from '../scenes/VehicleSelectScene.js';
import { StageSelectScene } from '../scenes/StageSelectScene.js';
import { ShopScene } from '../scenes/ShopScene.js';
import { SettingsScene } from '../scenes/SettingsScene.js';
import { GameScene } from '../scenes/GameScene.js';
import { characters } from '../data/characters.js';
import { vehicles } from '../data/vehicles.js';
import { stages } from '../data/stages.js';
import { bonusStages } from '../data/bonusStages.js';
import { reportValidation, validateAssetPaths, validateData } from '../utils/dataValidation.js';

/**
 * Start (or return the already-started) Phaser game.
 *
 * Idempotent: if `window.game` already exists, the existing Phaser.Game is
 * returned and NO second Phaser.Game is created. All boot-time work
 * (data validation, global error handler, Phaser init) runs exactly once.
 *
 * @returns {Phaser.Game|null} The Phaser.Game instance, or null on init failure.
 */
export function startGame() {
  // Idempotent guard: never create a second Phaser.Game instance.
  if (window.game) {
    return window.game;
  }

  const contentData = { characters, vehicles, stages, bonusStages };
  reportValidation(validateData(contentData));
  void validateAssetPaths(contentData);

  // Error handling
  window.addEventListener('error', (e) => {
    console.error('Game Error:', e.error);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:20px;z-index:9999;font-family:monospace;white-space:pre-wrap;';
    errorDiv.textContent = `Error: ${e.error?.message || e.message}\n\nStack: ${e.error?.stack || 'N/A'}`;
    document.body.appendChild(errorDiv);
  });

  try {
    const game = new Phaser.Game({
      ...gameConfig,
      scene: [
        LoadingScene,
        MainMenuScene,
        CharacterSelectScene,
        VehicleSelectScene,
        StageSelectScene,
        ShopScene,
        SettingsScene,
        GameScene
      ]
    });

    // Make game accessible globally for debugging
    window.game = game;

    console.log('🇳🇵 Nepali Racer 🚗 - Game initialized!');
    return game;
  } catch (e) {
    console.error('Failed to initialize game:', e);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:20px;z-index:9999;font-family:monospace;';
    errorDiv.textContent = `Failed to initialize: ${e.message}`;
    document.body.appendChild(errorDiv);
    return null;
  }
}

export default startGame;