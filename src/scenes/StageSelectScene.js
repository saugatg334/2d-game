// ============================================
// Nepali Racer - Stage Selection Scene
// ============================================

import { COLORS, SCENES } from '../config/constants.js';
import { Button } from '../ui/Button.js';
import { CurrencyDisplay } from '../ui/CurrencyDisplay.js';
import { SelectionPanel } from '../ui/SelectionPanel.js';
import { stages } from '../data/stages.js';
import { saveSystem } from '../systems/SaveSystem.js';
import { isStageProgressionUnlocked, isStagePlayable } from '../game/StageProgression.js';
import { unlockStageWithProgression } from '../systems/purchase.js';
import { showToast } from '../ui/Toast.js';

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

    // P3 Step 3: resolve the selected stage to a stage the player may actually
    // play (progression + ownership). A stale/invalid, or a previously-saved
    // but now progression-blocked, selection falls back to the first playable
    // main stage so the game never lands the player on a blocked stage.
    let selected = stages.find(stage => stage.id === saveSystem.getSelectedStage());
    if (!selected || !isStagePlayable(selected.id, saveSystem)) {
      selected = stages.find(s => isStagePlayable(s.id, saveSystem)) || stages[0];
    }
    this.selectedStage = selected;

    // F7: if the saved ID was stale/invalid, persist the fallback we resolved to.
    saveSystem.persistSelectionIfStale('selectedStage', this.selectedStage.id);

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
      if (this.selectedStage && isStagePlayable(this.selectedStage.id, saveSystem)) {
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
      getUnlocked: stage => isStagePlayable(stage.id, saveSystem),
      getLockHint: stage =>
        isStageProgressionUnlocked(stage.id, saveSystem.data)
          ? null // progression OK -> existing cost/price display already applies
          : 'Complete previous stage',
      getStats: stage => [`${stage.targetDistance}m`, '⭐'.repeat(stage.difficulty)]
    });
    this.selectionPanel.setItems(stages, this.selectedStage?.id);
    this.selectionPanel.onSelectItem(stage => {
      this.selectedStage = stage;
    });
    // P6B: locked cards show their unlock requirement (existing lock hint +
    // cost display) and now open the purchase prompt when progression allows
    // it. Sequential progression stays enforced — currency alone can never
    // bypass the previous-stage requirement.
    this.selectionPanel.onLockedItem(stage => this.promptStageUnlock(stage));
  }

  // P6B: purchase prompt for locked stages. The progression gate is evaluated
  // FIRST: a progression-locked stage only explains the requirement and never
  // shows a price prompt, so currency can never bypass progression. When
  // progression is satisfied, unlock requires BOTH progression AND currency.
  promptStageUnlock(stage) {
    if (!stage || isStagePlayable(stage.id, saveSystem)) return;
    if (!isStageProgressionUnlocked(stage.id, saveSystem.data)) {
      showToast(this, 'Complete the previous stage first!');
      return;
    }
    const currencyIcon = stage.currency === 'diamonds' ? '💎' : '🪙';
    const button = this.add.text(this.scale.width / 2, this.scale.height / 2 + 40,
      `UNLOCK FOR ${stage.cost} ${currencyIcon}?`, {
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
      const result = unlockStageWithProgression(saveSystem, stage);
      if (!result.ok && result.message) showToast(this, result.message);
      this.createStageGrid(this.scale.width / 2, this.scale.height / 2 - 20);
      this.currencyDisplay.setCoins(saveSystem.getCoins());
      this.currencyDisplay.setDiamonds(saveSystem.getDiamonds());
    });
    cancel.on('pointerup', cleanup);
  }
}

export default StageSelectScene;
