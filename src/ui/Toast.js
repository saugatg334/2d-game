// ============================================
// Nepali Racer - Toast Message Overlay
// ============================================
// P6B: shared transient message overlay extracted from ShopScene.showMsg so
// every scene shows purchase feedback identically. Pure presentation only —
// no state, no persistence, no gameplay involvement.

import { COLORS } from '../config/constants.js';

/**
 * Show a temporary centered message box over the scene.
 * @param {Phaser.Scene} scene
 * @param {string} message
 * @param {{duration?: number}} [options] duration in ms (default 1500)
 */
export function showToast(scene, message, options = {}) {
  const duration = Number.isFinite(options.duration) ? options.duration : 1500;
  const { width, height } = scene.scale;

  const overlay = scene.add.graphics();
  overlay.fillStyle(0x000000, 0.8);
  overlay.fillRect(0, 0, width, height);

  const box = scene.add.graphics();
  box.fillStyle(COLORS.DARKER, 1);
  box.fillRoundedRect(width / 2 - 170, height / 2 - 40, 340, 80, 12);
  box.lineStyle(2, COLORS.WARNING, 1);
  box.strokeRoundedRect(width / 2 - 170, height / 2 - 40, 340, 80, 12);

  const text = scene.add.text(width / 2, height / 2, message, {
    fontSize: '15px',
    color: COLORS.WARNING,
    align: 'center',
    wordWrap: { width: 300 }
  }).setOrigin(0.5);

  scene.time.delayedCall(duration, () => {
    overlay.destroy();
    box.destroy();
    text.destroy();
  });
}

export default showToast;
