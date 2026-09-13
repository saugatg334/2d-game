// ============================================
// Nepali Racer - Stage Selection Scene
// ============================================

import { COLORS, SCENES } from '../config/constants.js';
import { Button } from '../ui/Button.js';
import { CurrencyDisplay } from '../ui/CurrencyDisplay.js';
import { SelectionPanel } from '../ui/SelectionPanel.js';
import { stages } from '../data/stages.js';
import { saveSystem } from '../systems/SaveSystem.js';

export class StageSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.STAGE_SELECT });
  }

  preload() {
    this.missingAssets = new Set();
    this.load.on('loaderror', file => this.missingAssets.add(file.key));
    stages.forEach(stage => {
      const key = 'stage_' + stage.id;
      if (stage.thumbnail && !this.textures.exists(key)) this.load.image(key, stage.thumbnail);
    });
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(COLORS.DARK);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.selectedStage = stages.find(stage => stage.id === saveSystem.getSelectedStage()) || stages[0];

    this.currencyDisplay = new CurrencyDisplay(this, 30, 30);
    this.currencyDisplay.setCoins(saveSystem.getCoins());
    this.currencyDisplay.setDiamonds(saveSystem.getDiamonds());

    this.add.text(width / 2, 60, '🗺️ Select Stage', {
      fontSize: '36px', color: COLORS.WHITE, fontStyle: 'bold'
    }).setOrigin(0.5);

    this.createStageGrid(width / 2, height / 2 - 20);

    this.backButton = new Button(this, 100, height - 50, '← BACK', {
      width: 140, height: 50, bgColor: COLORS.SECONDARY, fontSize: 16
    });
    this.backButton.onClick(() => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENES.VEHICLE_SELECT);
      });
    });

    this.startButton = new Button(this, width - 130, height - 50, 'START →', {
      width: 160, height: 50, bgColor: COLORS.SUCCESS, fontSize: 16
    });
    this.startButton.onClick(() => {
      if (this.selectedStage) {
        saveSystem.setSelectedStage(this.selectedStage.id);
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(SCENES.GAME);
        });
      }
    });
  }

  createStageGrid(x, y) {
    const cardWidth = 220;
    const cardHeight = 260;
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
      selectedId: this.selectedStage?.id,
      imageKey: stage => 'stage_' + stage.id,
      imageWidth: 170,
      imageHeight: 62,
      getUnlocked: stage => saveSystem.isStageUnlocked(stage.id),
      getStats: stage => [`${stage.targetDistance}m`, '⭐'.repeat(stage.difficulty)]
    });
    this.selectionPanel.setItems(stages, this.selectedStage?.id);
    this.selectionPanel.onSelectItem(stage => {
      this.selectedStage = stage;
    });
  }
}

export default StageSelectScene;
