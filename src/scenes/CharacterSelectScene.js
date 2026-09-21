// ============================================
// Nepali Racer - Character Selection Scene
// ============================================

import { COLORS, SCENES } from '../config/constants.js';
import { Button } from '../ui/Button.js';
import { CurrencyDisplay } from '../ui/CurrencyDisplay.js';
import { SelectionPanel } from '../ui/SelectionPanel.js';
import { characters } from '../data/characters.js';
import { saveSystem } from '../systems/SaveSystem.js';
import { buyCharacter } from '../systems/purchase.js';
import { showToast } from '../ui/Toast.js';

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.CHARACTER_SELECT });
  }

  preload() {
    this.missingAssets = new Set();
    this.load.on('loaderror', file => this.missingAssets.add(file.key));
    characters.forEach(character => {
      const key = 'character_' + character.id;
      if (character.thumbnail && !this.textures.exists(key)) this.load.image(key, character.thumbnail);
    });
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(COLORS.DARK);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.selectedCharacter = characters.find(character => character.id === saveSystem.getSelectedCharacter()) || characters[0];

    // F7: if the saved ID was stale/invalid, persist the fallback we resolved to.
    saveSystem.persistSelectionIfStale('selectedCharacter', this.selectedCharacter.id);

    this.currencyDisplay = new CurrencyDisplay(this, 30, 30);
    this.currencyDisplay.setCoins(saveSystem.getCoins());
    this.currencyDisplay.setDiamonds(saveSystem.getDiamonds());

    this.add.text(width / 2, 60, '👤 Select Character', {
      fontSize: '36px',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.createCharacterGrid(width / 2, height / 2 - 20);

    this.backButton = new Button(this, 100, height - 50, '← BACK', {
      width: 140, height: 50, bgColor: COLORS.SECONDARY, fontSize: 16
    });
    this.backButton.onClick(() => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENES.MAIN_MENU);
      });
    });

    this.selectButton = new Button(this, width - 130, height - 50, 'SELECT →', {
      width: 160, height: 50, bgColor: COLORS.SUCCESS, fontSize: 16
    });
    this.selectButton.onClick(() => {
      if (this.selectedCharacter) {
        saveSystem.setSelectedCharacter(this.selectedCharacter.id);
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(SCENES.VEHICLE_SELECT);
        });
      }
    });
  }

  createCharacterGrid(x, y) {
    const cardWidth = 200;
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
      selectedId: this.selectedCharacter?.id,
      imageKey: character => 'character_' + character.id,
      imageWidth: 100,
      imageHeight: 100,
      getUnlocked: character => saveSystem.isCharacterUnlocked(character.id),
      getStats: character => [`Handling ${character.stats.handling}`]
    });
    this.selectionPanel.setItems(characters, this.selectedCharacter?.id);
    this.selectionPanel.onSelectItem(character => {
      this.selectedCharacter = character;
    });
    // P6B: locked cards open the purchase prompt; the panel fully rebuilds so
    // the unlocked state and currency display refresh immediately.
    this.selectionPanel.onLockedItem(character => this.promptPurchase(character));
  }

  // P6B: shared confirmation prompt for locked characters. Purchase runs only
  // after the player confirms, and the grid + currency display refresh on both
  // outcomes (success -> unlocked; failure -> still locked with a message).
  promptPurchase(character) {
    if (!character || saveSystem.isCharacterUnlocked(character.id)) return;
    const currencyIcon = character.currency === 'diamonds' ? '💎' : '🪙';
    const button = this.add.text(this.scale.width / 2, this.scale.height / 2 + 40,
      `UNLOCK FOR ${character.cost} ${currencyIcon}?`, {
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
      const result = buyCharacter(saveSystem, character);
      if (result.ok) {
        this.selectedCharacter = character;
      } else if (result.message) {
        showToast(this, result.message);
      }
      this.createCharacterGrid(this.scale.width / 2, this.scale.height / 2 - 20);
      this.currencyDisplay.setCoins(saveSystem.getCoins());
      this.currencyDisplay.setDiamonds(saveSystem.getDiamonds());
    });
    cancel.on('pointerup', cleanup);
  }
}

export default CharacterSelectScene;
