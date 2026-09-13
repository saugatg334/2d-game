// ============================================
// Nepali Racer - Selection Panel Component
// ============================================

import { COLORS } from '../config/constants.js';
import { Card } from './Card.js';

export class SelectionPanel extends Phaser.GameObjects.Container {
  constructor(scene, x, y, options = {}) {
    super(scene, x, y);

    this.options = {
      columns: 3,
      cardWidth: 180,
      cardHeight: 220,
      cardSpacing: 20,
      bgColor: '#16213e',
      imageKey: item => item.id,
      imageWidth: 120,
      imageHeight: 70,
      getUnlocked: item => item.unlocked !== false,
      getStats: () => [],
      selectedId: null,
      pageSize: 4,
      ...options
    };

    this.cards = [];
    this.selectedIndex = -1;
    this.items = [];
    this.onSelect = null;
    this.currentPage = 0;
    this.paginationElements = [];

    scene.add.existing(this);
  }

  setItems(items, selectedId = this.options.selectedId) {
    this.items = items;
    this.selectedIndex = items.findIndex(item => item.id === selectedId);
    this.currentPage = this.selectedIndex >= 0
      ? Math.floor(this.selectedIndex / this.options.pageSize)
      : 0;
    this.clearCards();
    this.createCards();
    this.createPagination();
  }

  clearCards() {
    const destroyed = new Set();
    const destroyObject = object => {
      if (!object || destroyed.has(object)) return;
      if (Array.isArray(object)) {
        object.forEach(destroyObject);
        return;
      }
      if (typeof object.destroy === 'function') {
        destroyed.add(object);
        object.destroy();
        return;
      }
      if (object.card) destroyObject(object.card);
      if (object.gameObject) destroyObject(object.gameObject);
      if (object.object) destroyObject(object.object);
    };

    this.cards.forEach(destroyObject);
    this.paginationElements.forEach(destroyObject);
    this.cards = [];
    this.paginationElements = [];
  }

  createCards() {
    const { columns, cardWidth, cardHeight, cardSpacing } = this.options;
    const pageStart = this.currentPage * this.options.pageSize;
    const pageItems = this.items.slice(pageStart, pageStart + this.options.pageSize);

    pageItems.forEach((item, pageIndex) => {
      const index = pageStart + pageIndex;
      const col = pageIndex % columns;
      const row = Math.floor(pageIndex / columns);
      const x = col * (cardWidth + cardSpacing);
      const y = row * (cardHeight + cardSpacing);

      const card = new Card(this.scene, x, y, {
        width: cardWidth,
        height: cardHeight,
        bgColor: this.options.bgColor,
        borderColor: index === this.selectedIndex ? COLORS.PRIMARY : COLORS.GRAY
      });

      const isUnlocked = this.options.getUnlocked(item);

      // Item image
      const imageKey = this.options.imageKey(item);
      if (imageKey && this.scene.textures.exists(imageKey)) {
        const image = this.scene.add.image(0, -cardHeight / 2 + 58, imageKey)
          .setDisplaySize(this.options.imageWidth, this.options.imageHeight);
        card.add(image);
      } else {
        const missingText = this.scene.add.text(0, -cardHeight / 2 + 58, 'IMAGE MISSING\n' + (item.id || 'unknown'), {
          fontSize: '11px',
          color: COLORS.WARNING,
          align: 'center',
          wordWrap: { width: cardWidth - 20 }
        });
        missingText.setOrigin(0.5);
        card.add(missingText);
      }

      // Item name
      const nameText = this.scene.add.text(0, -cardHeight / 2 + 112, item.name, {
        fontSize: '16px',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        color: COLORS.WHITE,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: cardWidth - 20 }
      });
      nameText.setOrigin(0.5);
      card.add(nameText);

      // Item description
      if (item.description) {
        const descText = this.scene.add.text(0, -cardHeight / 2 + 138, item.description, {
          fontSize: '12px',
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          color: COLORS.GRAY,
          align: 'center',
          wordWrap: { width: cardWidth - 20 }
        });
        descText.setOrigin(0.5);
        card.add(descText);
      }

      const stats = this.options.getStats(item);
      if (stats.length > 0) {
        const statsText = this.scene.add.text(0, -cardHeight / 2 + 174, stats.join('  '), {
          fontSize: '11px',
          color: COLORS.ACCENT,
          align: 'center',
          wordWrap: { width: cardWidth - 20 }
        });
        statsText.setOrigin(0.5);
        card.add(statsText);
      }

      // Lock status
      if (!isUnlocked) {
        const lockText = this.scene.add.text(0, cardHeight / 2 - 40, '🔒', {
          fontSize: '24px'
        });
        lockText.setOrigin(0.5);
        card.add(lockText);

        const costText = this.scene.add.text(
          0,
          cardHeight / 2 - 15,
          `${item.cost} ${item.currency === 'diamonds' ? '💎' : '🪙'}`,
          {
            fontSize: '14px',
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            color: item.currency === 'diamonds' ? COLORS.DIAMOND : COLORS.GOLD
          }
        );
        costText.setOrigin(0.5);
        card.add(costText);
      } else {
        const unlockedText = this.scene.add.text(0, cardHeight / 2 - 30,
          index === this.selectedIndex ? '✓ SELECTED' : '✓ UNLOCKED', {
          fontSize: '14px',
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          color: COLORS.SUCCESS,
          fontStyle: 'bold'
        });
        unlockedText.setOrigin(0.5);
        card.add(unlockedText);
      }

      // Make interactive
      card.onClick(() => this.selectItem(index));

      this.add(card);
      this.cards.push({ card, item, index });
    });
  }

  createPagination() {
    this.paginationElements.forEach(element => element.destroy());
    this.paginationElements = [];

    const pageCount = Math.ceil(this.items.length / this.options.pageSize);
    if (pageCount <= 1) return;

    const controlsY = -this.options.cardHeight / 2 - 26;
    const centerX = ((this.options.columns - 1) * (this.options.cardWidth + this.options.cardSpacing)) / 2;
    const previousButton = this.scene.add.text(centerX - 100, controlsY, '< PREV', {
      fontSize: '16px', color: COLORS.WHITE, backgroundColor: '#333333', padding: { x: 8, y: 5 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const pageText = this.scene.add.text(centerX, controlsY, `PAGE ${this.currentPage + 1} / ${pageCount}`, {
      fontSize: '16px', color: COLORS.WARNING, fontStyle: 'bold'
    }).setOrigin(0.5);
    const nextButton = this.scene.add.text(centerX + 100, controlsY, 'NEXT >', {
      fontSize: '16px', color: COLORS.WHITE, backgroundColor: '#333333', padding: { x: 8, y: 5 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    previousButton.on('pointerup', () => {
      if (this.currentPage > 0) this.setPage(this.currentPage - 1);
    });
    nextButton.on('pointerup', () => {
      if (this.currentPage < pageCount - 1) this.setPage(this.currentPage + 1);
    });

    this.paginationElements.push(previousButton, pageText, nextButton);
    this.paginationElements.forEach(element => this.add(element));
  }

  setPage(page) {
    const pageCount = Math.ceil(this.items.length / this.options.pageSize);
    this.currentPage = Phaser.Math.Clamp(page, 0, pageCount - 1);
    this.clearCards();
    this.createCards();
    this.createPagination();
  }

  selectItem(index) {
    if (!this.options.getUnlocked(this.items[index])) return;
    this.selectedIndex = index;
    this.currentPage = Math.floor(index / this.options.pageSize);

    // Update card borders
    this.cards.forEach(({ card, index: cardIndex }) => {
      card.setBorderColor(cardIndex === index ? COLORS.PRIMARY : COLORS.GRAY);
    });

    if (this.onSelect) {
      this.onSelect(this.items[index], index);
    }
  }

  onSelectItem(callback) {
    this.onSelect = callback;
  }
}

export default SelectionPanel;
