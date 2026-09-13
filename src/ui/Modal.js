// ============================================
// Nepali Racer - Modal Component
// ============================================

import { COLORS } from '../config/constants.js';
import { Button } from './Button.js';

export class Modal extends Phaser.GameObjects.Container {
  constructor(scene, options = {}) {
    super(scene, scene.scale.width / 2, scene.scale.height / 2);

    this.options = {
      width: 400,
      height: 300,
      title: '',
      message: '',
      buttons: [],
      closable: true,
      ...options
    };

    const { width, height } = this.options;

    // Overlay
    this.overlay = scene.add.rectangle(
      0,
      0,
      scene.scale.width * 2,
      scene.scale.height * 2,
      0x000000,
      0.7
    );
    this.overlay.setOrigin(0.5);
    this.overlay.setInteractive();
    this.add(this.overlay);

    // Background
    this.bg = scene.add.graphics();
    this.bg.fillStyle(COLORS.DARKER, 1);
    this.bg.fillRoundedRect(-width / 2, -height / 2, width, height, 20);
    this.bg.lineStyle(3, COLORS.PRIMARY, 1);
    this.bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 20);
    this.add(this.bg);

    // Title
    if (this.options.title) {
      this.titleText = scene.add.text(0, -height / 2 + 30, this.options.title, {
        fontSize: '24px',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        color: COLORS.WHITE,
        fontStyle: 'bold'
      });
      this.titleText.setOrigin(0.5);
      this.add(this.titleText);
    }

    // Message
    if (this.options.message) {
      this.messageText = scene.add.text(0, 0, this.options.message, {
        fontSize: '16px',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        color: COLORS.LIGHT,
        align: 'center',
        wordWrap: { width: width - 40 }
      });
      this.messageText.setOrigin(0.5);
      this.add(this.messageText);
    }

    // Buttons
    this.buttons = [];
    if (this.options.buttons.length > 0) {
      const buttonY = height / 2 - 50;
      const buttonSpacing = 20;
      const totalWidth =
        this.options.buttons.length * 150 + (this.options.buttons.length - 1) * buttonSpacing;
      const startX = -totalWidth / 2 + 75;

      this.options.buttons.forEach((btn, index) => {
        const btnX = startX + index * (150 + buttonSpacing);
        const button = new Button(this.scene, btnX, buttonY, btn.text, {
          width: 150,
          height: 50,
          bgColor: btn.color || COLORS.PRIMARY
        });
        button.onClick(btn.onClick || (() => this.close()));
        this.add(button);
        this.buttons.push(button);
      });
    }

    // Close on overlay click
    if (this.options.closable) {
      this.overlay.on('pointerup', () => this.close());
    }

    this.setDepth(1000);
    scene.add.existing(this);
  }

  close() {
    this.destroy();
  }

  setTitle(title) {
    if (this.titleText) {
      this.titleText.setText(title);
    }
  }

  setMessage(message) {
    if (this.messageText) {
      this.messageText.setText(message);
    }
  }
}

export default Modal;
