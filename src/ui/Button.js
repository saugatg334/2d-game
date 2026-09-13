// ============================================
// Nepali Racer - Button Component
// ============================================

import { COLORS } from '../config/constants.js';

export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, text, options = {}) {
    super(scene, x, y);

    this.options = {
      width: 200,
      height: 60,
      bgColor: COLORS.PRIMARY,
      textColor: COLORS.WHITE,
      fontSize: 20,
      fontStyle: 'bold',
      borderRadius: 12,
      hoverScale: 1.05,
      pressScale: 0.95,
      ...options
    };

    const { width, height, bgColor, borderRadius } = this.options;

    // Background
    this.bg = scene.add.graphics();
    this.bg.fillStyle(bgColor, 1);
    this.bg.fillRoundedRect(-width / 2, -height / 2, width, height, borderRadius);
    this.add(this.bg);

    // Text
    this.label = scene.add.text(0, 0, text, {
      fontSize: `${this.options.fontSize}px`,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      color: this.options.textColor,
      fontStyle: this.options.fontStyle
    });
    this.label.setOrigin(0.5);
    this.add(this.label);

    // Interactive
    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });

    // Events
    this.on('pointerover', () => this.onHover());
    this.on('pointerout', () => this.onOut());
    this.on('pointerdown', () => this.onPress());
    this.on('pointerup', () => this.onRelease());

    scene.add.existing(this);
  }

  onHover() {
    this.scene.tweens.add({
      targets: this,
      scaleX: this.options.hoverScale,
      scaleY: this.options.hoverScale,
      duration: 100,
      ease: 'Power2'
    });
  }

  onOut() {
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
      ease: 'Power2'
    });
  }

  onPress() {
    this.scene.tweens.add({
      targets: this,
      scaleX: this.options.pressScale,
      scaleY: this.options.pressScale,
      duration: 50,
      ease: 'Power2'
    });
  }

  onRelease() {
    this.scene.tweens.add({
      targets: this,
      scaleX: this.options.hoverScale,
      scaleY: this.options.hoverScale,
      duration: 50,
      ease: 'Power2'
    });
  }

  setText(text) {
    this.label.setText(text);
  }

  setBackgroundColor(color) {
    const { width, height, borderRadius } = this.options;
    this.bg.clear();
    this.bg.fillStyle(color, 1);
    this.bg.fillRoundedRect(-width / 2, -height / 2, width, height, borderRadius);
  }

  onClick(callback) {
    this.on('pointerup', callback);
  }
}

export default Button;
