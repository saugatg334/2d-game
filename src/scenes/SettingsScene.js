// ============================================
// Nepali Racer - Settings Scene
// ============================================

import { COLORS, SCENES } from '../config/constants.js';
import { Button } from '../ui/Button.js';
import { saveSystem } from '../systems/SaveSystem.js';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.SETTINGS });
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(COLORS.DARK);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.add.text(width / 2, 80, '⚙️ Settings', {
      fontSize: '36px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Settings options
    this.settings = [
      { key: 'sound', label: '🔊 Sound', value: saveSystem.getSetting('sound') },
      { key: 'music', label: '🎵 Music', value: saveSystem.getSetting('music') },
      { key: 'vibration', label: '📳 Vibration', value: saveSystem.getSetting('vibration') },
      { key: 'debugMode', label: '🐛 Debug Mode', value: saveSystem.getSetting('debugMode') }
    ];

    this.settingElements = [];

    this.settings.forEach((setting, index) => {
      const y = 180 + index * 80;

      // Background
      const bg = this.add.graphics();
      bg.fillStyle(0x16213e, 1);
      bg.fillRoundedRect(width / 2 - 200, y - 30, 400, 60, 12);
      bg.lineStyle(2, COLORS.GRAY, 0.5);
      bg.strokeRoundedRect(width / 2 - 200, y - 30, 400, 60, 12);

      // Label
      this.add.text(width / 2 - 150, y, setting.label, {
        fontSize: '20px',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        color: COLORS.WHITE
      }).setOrigin(0, 0.5);

      // Toggle button
      const toggleBg = this.add.graphics();
      const toggleColor = setting.value ? COLORS.SUCCESS : COLORS.GRAY;
      toggleBg.fillStyle(toggleColor, 1);
      toggleBg.fillRoundedRect(width / 2 + 80, y - 15, 100, 30, 15);

      const toggleText = this.add.text(width / 2 + 130, y, setting.value ? 'ON' : 'OFF', {
        fontSize: '14px',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        color: COLORS.WHITE,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const hitZone = this.add.zone(width / 2 + 130, y, 100, 30).setInteractive();
      hitZone.on('pointerup', () => {
        const newValue = !setting.value;
        setting.value = newValue;
        saveSystem.setSetting(setting.key, newValue);

        // Update visual
        const newColor = newValue ? COLORS.SUCCESS : COLORS.GRAY;
        toggleBg.clear();
        toggleBg.fillStyle(newColor, 1);
        toggleBg.fillRoundedRect(width / 2 + 80, y - 15, 100, 30, 15);
        toggleText.setText(newValue ? 'ON' : 'OFF');
      });

      this.settingElements.push({ toggleBg, toggleText });
    });

    // Reset button
    const resetButton = new Button(this, width / 2, height - 150, 'RESET GAME', {
      width: 200,
      height: 50,
      bgColor: COLORS.WARNING,
      textColor: COLORS.DARK,
      fontSize: 16
    });
    resetButton.onClick(() => {
      saveSystem.reset();
      this.scene.restart();
    });

    // Back button
    const backButton = new Button(this, width / 2, height - 80, '← BACK', {
      width: 200,
      height: 50,
      bgColor: COLORS.SECONDARY,
      fontSize: 16
    });
    backButton.onClick(() => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENES.MAIN_MENU);
      });
    });
  }
}

export default SettingsScene;
