// ============================================
// Nepali Racer - Vehicle Selection Scene
// ============================================

import { COLORS, SCENES } from '../config/constants.js';
import { Button } from '../ui/Button.js';
import { CurrencyDisplay } from '../ui/CurrencyDisplay.js';
import { SelectionPanel } from '../ui/SelectionPanel.js';
import { vehicles } from '../data/vehicles.js';
import { saveSystem } from '../systems/SaveSystem.js';

export class VehicleSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.VEHICLE_SELECT });
  }

  preload() {
    this.missingAssets = new Set();
    this.load.on('loaderror', file => this.missingAssets.add(file.key));
    vehicles.forEach(vehicle => {
      const key = 'vehicle_' + vehicle.id;
      if (vehicle.thumbnail && !this.textures.exists(key)) this.load.image(key, vehicle.thumbnail);
    });
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(COLORS.DARK);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.selectedVehicle = vehicles.find(vehicle => vehicle.id === saveSystem.getSelectedVehicle()) || vehicles[0];

    this.currencyDisplay = new CurrencyDisplay(this, 30, 30);
    this.currencyDisplay.setCoins(saveSystem.getCoins());
    this.currencyDisplay.setDiamonds(saveSystem.getDiamonds());

    this.add.text(width / 2, 60, '🚗 Select Vehicle', {
      fontSize: '36px', color: COLORS.WHITE, fontStyle: 'bold'
    }).setOrigin(0.5);

    this.createVehicleGrid(width / 2, height / 2 - 20);

    this.backButton = new Button(this, 100, height - 50, '← BACK', {
      width: 140, height: 50, bgColor: COLORS.SECONDARY, fontSize: 16
    });
    this.backButton.onClick(() => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENES.CHARACTER_SELECT);
      });
    });

    this.selectButton = new Button(this, width - 130, height - 50, 'SELECT →', {
      width: 160, height: 50, bgColor: COLORS.SUCCESS, fontSize: 16
    });
    this.selectButton.onClick(() => {
      if (this.selectedVehicle) {
        saveSystem.setSelectedVehicle(this.selectedVehicle.id);
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(SCENES.STAGE_SELECT);
        });
      }
    });
  }

  createVehicleGrid(x, y) {
    const cardWidth = 220;
    const cardHeight = 280;
    const cardSpacing = 20;
    const columns = 4;
    const totalWidth = columns * cardWidth + (columns - 1) * cardSpacing;
    const startX = x - totalWidth / 2 + cardWidth / 2;
    this.selectionPanel?.destroy();
    this.selectionPanel = new SelectionPanel(this, startX, y, {
      columns,
      cardWidth,
      cardHeight,
      cardSpacing,
      pageSize: 4,
      selectedId: this.selectedVehicle?.id,
      imageKey: vehicle => 'vehicle_' + vehicle.id,
      imageWidth: 160,
      imageHeight: 90,
      getUnlocked: vehicle => saveSystem.isVehicleUnlocked(vehicle.id),
      getStats: vehicle => [
        `SPD ${vehicle.stats.maxSpeed}`,
        `ACC ${vehicle.stats.acceleration}`,
        `BRK ${vehicle.stats.brakeForce}`
      ]
    });
    this.selectionPanel.setItems(vehicles, this.selectedVehicle?.id);
    this.selectionPanel.onSelectItem(vehicle => {
      this.selectedVehicle = vehicle;
    });
  }
}

export default VehicleSelectScene;
