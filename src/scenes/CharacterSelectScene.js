// ============================================
// Nepali Racer - Character Selection Scene
// ============================================

import { COLORS, SCENES } from '../config/constants.js';
import { Button } from '../ui/Button.js';
import { CurrencyDisplay } from '../ui/CurrencyDisplay.js';
import { SelectionPanel } from '../ui/SelectionPanel.js';
import { characters } from '../data/characters.js';
import { saveSystem } from '../systems/SaveSystem.js';

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
  }
}

export default CharacterSelectScene;
