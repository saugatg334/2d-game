// ============================================
// Nepali Racer - Main Menu Scene
// ============================================

import { COLORS, SCENES } from '../config/constants.js';
import { Button } from '../ui/Button.js';
import { CurrencyDisplay } from '../ui/CurrencyDisplay.js';
import { saveSystem } from '../systems/SaveSystem.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.MAIN_MENU });
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.cameras.main.setBackgroundColor(COLORS.DARK);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Currency display
    this.currencyDisplay = new CurrencyDisplay(this, 30, 30);
    this.currencyDisplay.setCoins(saveSystem.getCoins());
    this.currencyDisplay.setDiamonds(saveSystem.getDiamonds());

    // Title
    this.add.text(width / 2, 100, '🇳🇵 Nepali Racer 🚗', {
      fontSize: '56px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, 160, 'Hill Climbing Racing', {
      fontSize: '20px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      color: COLORS.GRAY
    }).setOrigin(0.5);

    // Selection displays
    this.createSelectionDisplay(width / 2, 240);

    // Main buttons
    const buttonY = height / 2 + 60;
    const buttonSpacing = 80;

    this.startButton = new Button(this, width / 2, buttonY, 'START GAME', {
      width: 280,
      height: 70,
      bgColor: COLORS.SUCCESS,
      fontSize: 24
    });
    this.startButton.onClick(() => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENES.CHARACTER_SELECT);
      });
    });

    this.shopButton = new Button(this, width / 2, buttonY + buttonSpacing, 'SHOP', {
      width: 280,
      height: 60,
      bgColor: COLORS.PRIMARY,
      fontSize: 20
    });
    this.shopButton.onClick(() => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENES.SHOP);
      });
    });

    this.settingsButton = new Button(
      this,
      width / 2,
      buttonY + buttonSpacing * 2,
      'SETTINGS',
      {
        width: 280,
        height: 60,
        bgColor: COLORS.SECONDARY,
        fontSize: 20
      }
    );
    this.settingsButton.onClick(() => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENES.SETTINGS);
      });
    });
  }

  createSelectionDisplay(x, y) {
    const panelWidth = 500;
    const panelHeight = 80;

    // Background panel
    const bg = this.add.graphics();
    bg.fillStyle(0x16213e, 1);
    bg.fillRoundedRect(x - panelWidth / 2, y - panelHeight / 2, panelWidth, panelHeight, 12);
    bg.lineStyle(2, COLORS.GRAY, 0.5);
    bg.strokeRoundedRect(x - panelWidth / 2, y - panelHeight / 2, panelWidth, panelHeight, 12);

    // Character selection
    this.add.text(x - panelWidth / 2 + 20, y - 15, '👤 Character', {
      fontSize: '14px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      color: COLORS.GRAY
    });

    this.add.text(x - panelWidth / 2 + 20, y + 5, 'Default Rider', {
      fontSize: '16px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    });

    // Vehicle selection
    this.add.text(x - 50, y - 15, '🚗 Vehicle', {
      fontSize: '14px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      color: COLORS.GRAY
    });

    this.add.text(x - 50, y + 5, 'Tempo', {
      fontSize: '16px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    });

    // Stage selection
    this.add.text(x + panelWidth / 2 - 140, y - 15, '🗺️ Stage', {
      fontSize: '14px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      color: COLORS.GRAY
    });

    this.add.text(x + panelWidth / 2 - 140, y + 5, 'KTM Valley', {
      fontSize: '16px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    });
  }
}

export default MainMenuScene;
