// ============================================
// Nepali Racer - Vehicle Selection Scene
// ============================================

import { COLORS, SCENES } from '../config/constants.js';
import { Button } from '../ui/Button.js';
import { CurrencyDisplay } from '../ui/CurrencyDisplay.js';
import { SelectionPanel } from '../ui/SelectionPanel.js';
import { vehicles } from '../data/vehicles.js';
import { saveSystem } from '../systems/SaveSystem.js';
import { buyVehicle } from '../systems/purchase.js';
import { showToast } from '../ui/Toast.js';

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

    // F7: if the saved ID was stale/invalid, persist the fallback we resolved to.
    saveSystem.persistSelectionIfStale('selectedVehicle', this.selectedVehicle.id);

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
    // P6B: locked cards open the purchase prompt; the panel fully rebuilds so
    // the unlocked state and currency display refresh immediately.
    this.selectionPanel.onLockedItem(vehicle => this.promptPurchase(vehicle));
  }

  // P6B: shared confirmation prompt for locked vehicles. Purchase runs only
  // after the player confirms, and the grid + currency display refresh on both
  // outcomes (success -> unlocked; failure -> still locked with a message).
  promptPurchase(vehicle) {
    if (!vehicle || saveSystem.isVehicleUnlocked(vehicle.id)) return;
    const currencyIcon = vehicle.currency === 'diamonds' ? '💎' : '🪙';
    const button = this.add.text(this.scale.width / 2, this.scale.height / 2 + 40,
      `UNLOCK FOR ${vehicle.cost} ${currencyIcon}?`, {
        fontSize: '20px', color: COLORS.WHITE, backgroundColor: COLORS.PRIMARY,
        padding: { x: 16, y: 8 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const cancel = this.add.text(this.scale.width / 2, this.scale.height / 2 + 90,
      'CANCEL', {
        fontSize: '14px', color: COLORS.WHITE, backgroundColor: '#333333',
        padding: { x: 12, y: 6 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const cleanup = () => { button.destroy(); cancel.destroy(); };
    button.on('pointerup', () => {
      cleanup();
      const result = buyVehicle(saveSystem, vehicle);
      if (result.ok) {
        this.selectedVehicle = vehicle;
      } else if (result.message) {
        showToast(this, result.message);
      }
      this.createVehicleGrid(this.scale.width / 2, this.scale.height / 2 - 20);
      this.currencyDisplay.setCoins(saveSystem.getCoins());
      this.currencyDisplay.setDiamonds(saveSystem.getDiamonds());
    });
    cancel.on('pointerup', cleanup);
  }
}

export default VehicleSelectScene;
