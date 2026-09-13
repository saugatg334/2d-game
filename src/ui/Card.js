// ============================================
// Nepali Racer - Card Component
// ============================================

import { COLORS } from '../config/constants.js';

export class Card extends Phaser.GameObjects.Container {
  constructor(scene, x, y, options = {}) {
    super(scene, x, y);

    this.options = {
      width: 200,
      height: 250,
      bgColor: '#16213e',
      borderColor: COLORS.PRIMARY,
      borderWidth: 2,
      borderRadius: 16,
      shadow: true,
      ...options
    };

    const { width, height, bgColor, borderColor, borderWidth, borderRadius, shadow } = this.options;

    // Shadow
    if (shadow) {
      this.shadow = scene.add.graphics();
      this.shadow.fillStyle(0x000000, 0.3);
      this.shadow.fillRoundedRect(-width / 2 + 4, -height / 2 + 4, width, height, borderRadius);
      this.add(this.shadow);
    }

    // Background
    this.bg = scene.add.graphics();
    this.bg.fillStyle(bgColor, 1);
    this.bg.fillRoundedRect(-width / 2, -height / 2, width, height, borderRadius);

    // Border
    this.bg.lineStyle(borderWidth, borderColor, 1);
    this.bg.strokeRoundedRect(-width / 2, -height / 2, width, height, borderRadius);
    this.add(this.bg);

    scene.add.existing(this);
  }

  setBorderColor(color) {
    const { width, height, borderRadius, borderWidth } = this.options;
    this.bg.clear();
    this.bg.fillStyle(this.options.bgColor, 1);
    this.bg.fillRoundedRect(-width / 2, -height / 2, width, height, borderRadius);
    this.bg.lineStyle(borderWidth, color, 1);
    this.bg.strokeRoundedRect(-width / 2, -height / 2, width, height, borderRadius);
  }

  onClick(callback) {
    this.setSize(this.options.width, this.options.height);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerup', callback);
  }
}

export default Card;
