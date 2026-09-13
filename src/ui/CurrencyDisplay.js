// ============================================
// Nepali Racer - Currency Display Component
// ============================================

import { COLORS } from '../config/constants.js';

export class CurrencyDisplay extends Phaser.GameObjects.Container {
  constructor(scene, x, y, options = {}) {
    super(scene, x, y);

    this.options = {
      iconSize: 24,
      fontSize: 18,
      spacing: 8,
      ...options
    };

    // Coin display
    this.coinIcon = scene.add.text(0, 0, '🪙', {
      fontSize: `${this.options.iconSize}px`
    });
    this.coinIcon.setOrigin(0, 0.5);
    this.add(this.coinIcon);

    this.coinText = scene.add.text(this.options.iconSize + this.options.spacing, 0, '0', {
      fontSize: `${this.options.fontSize}px`,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    });
    this.coinText.setOrigin(0, 0.5);
    this.add(this.coinText);

    // Diamond display
    const diamondOffset = 100;
    this.diamondIcon = scene.add.text(diamondOffset, 0, '💎', {
      fontSize: `${this.options.iconSize}px`
    });
    this.diamondIcon.setOrigin(0, 0.5);
    this.add(this.diamondIcon);

    this.diamondText = scene.add.text(
      diamondOffset + this.options.iconSize + this.options.spacing,
      0,
      '0',
      {
        fontSize: `${this.options.fontSize}px`,
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        color: COLORS.DIAMOND,
        fontStyle: 'bold'
      }
    );
    this.diamondText.setOrigin(0, 0.5);
    this.add(this.diamondText);

    scene.add.existing(this);
  }

  setCoins(amount) {
    this.coinText.setText(amount.toString());
  }

  setDiamonds(amount) {
    this.diamondText.setText(amount.toString());
  }

  update(coins, diamonds) {
    this.setCoins(coins);
    this.setDiamonds(diamonds);
  }
}

export default CurrencyDisplay;
