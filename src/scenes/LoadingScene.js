// ============================================
// Nepali Racer - Loading Scene
// ============================================

import { COLORS, SCENES } from '../config/constants.js';

export class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.LOADING });
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.cameras.main.setBackgroundColor(COLORS.DARK);

    // Title
    this.titleText = this.add.text(width / 2, height / 2 - 60, '🇳🇵 Nepali Racer 🚗', {
      fontSize: '48px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    });
    this.titleText.setOrigin(0.5);

    // Loading text
    this.loadingText = this.add.text(width / 2, height / 2 + 20, 'Initializing...', {
      fontSize: '20px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      color: COLORS.GRAY
    });
    this.loadingText.setOrigin(0.5);

    // Progress bar background
    this.progressBg = this.add.graphics();
    this.progressBg.fillStyle(0x333333, 1);
    this.progressBg.fillRoundedRect(width / 2 - 150, height / 2 + 60, 300, 20, 10);

    // Progress bar fill
    this.progressFill = this.add.graphics();

    // Loading steps
    this.loadingSteps = [
      'Initializing...',
      'Verifying components...',
      'Loading game data...',
      'Preparing vehicles...',
      'Generating stages...',
      'Ready!'
    ];

    this.currentStep = 0;

    // Animate loading
    this.time.addEvent({
      delay: 200,
      callback: this.updateLoading,
      callbackScope: this,
      repeat: this.loadingSteps.length - 1
    });

    // Fade in
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  updateLoading() {
    this.currentStep++;
    const progress = this.currentStep / (this.loadingSteps.length - 1);

    // Update text
    this.loadingText.setText(this.loadingSteps[this.currentStep]);

    // Update progress bar
    const { width, height } = this.scale;
    this.progressFill.clear();
    this.progressFill.fillStyle(COLORS.PRIMARY, 1);
    this.progressFill.fillRoundedRect(
      width / 2 - 150,
      height / 2 + 60,
      300 * progress,
      20,
      10
    );

    // When complete, go to main menu
    if (this.currentStep >= this.loadingSteps.length - 1) {
      this.time.delayedCall(300, () => {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(SCENES.MAIN_MENU);
        });
      });
    }
  }
}

export default LoadingScene;
