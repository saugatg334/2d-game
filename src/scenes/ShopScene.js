import { COLORS, SCENES } from '../config/constants.js';
import { Button } from '../ui/Button.js';
import { CurrencyDisplay } from '../ui/CurrencyDisplay.js';
import { characters } from '../data/characters.js';
import { vehicles } from '../data/vehicles.js';
import { stages } from '../data/stages.js';
import { saveSystem } from '../systems/SaveSystem.js';

export class ShopScene extends Phaser.Scene {
  constructor() { super({ key: SCENES.SHOP }); }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLORS.DARK);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.currencyDisplay = new CurrencyDisplay(this, 30, 30);
    this.currencyDisplay.update(saveSystem.getCoins(), saveSystem.getDiamonds());

    this.add.text(width / 2, 50, '🛒 Shop', {
      fontSize: '36px', color: COLORS.WHITE, fontStyle: 'bold'
    }).setOrigin(0.5);

    this.currentCategory = 'vehicles';
    this.createTabs(width / 2, 100);
    this.createItems(width / 2, height / 2 + 20);

    new Button(this, 100, height - 40, '← BACK', {
      width: 140, height: 50, bgColor: COLORS.SECONDARY, fontSize: 16
    }).onClick(() => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENES.MAIN_MENU));
    });
  }

  createTabs(x, y) {
    const tabs = [
      { id: 'characters', label: '👤' },
      { id: 'vehicles', label: '🚗' },
      { id: 'stages', label: '🗺️' }
    ];
    const tw = 120, th = 40, sp = 10;
    const total = tabs.length * tw + (tabs.length - 1) * sp;
    const sx = x - total / 2 + tw / 2;

    tabs.forEach((tab, i) => {
      const tx = sx + i * (tw + sp);
      const bg = this.add.graphics();
      bg.fillStyle(this.currentCategory === tab.id ? COLORS.PRIMARY : 0x16213e, 1);
      bg.fillRoundedRect(tx - tw / 2, y - th / 2, tw, th, 8);
      this.add.text(tx, y, tab.label, { fontSize: '18px' }).setOrigin(0.5);
      this.add.zone(tx, y, tw, th).setInteractive().on('pointerup', () => {
        this.currentCategory = tab.id;
        this.createTabs(x, y);
        this.createItems(this.scale.width / 2, this.scale.height / 2 + 20);
      });
    });
  }

  createItems(x, y) {
    if (this.itemContainer) this.itemContainer.removeAll(true);
    else this.itemContainer = this.add.container(0, 0);

    const items = this.currentCategory === 'characters' ? characters :
                  this.currentCategory === 'vehicles' ? vehicles : stages;

    const cw = 180, ch = 200, sp = 15, cols = 4;
    const total = cols * cw + (cols - 1) * sp;
    const sx = x - total / 2 + cw / 2;

    items.forEach((item, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = sx + col * (cw + sp);
      const cy = y + row * (ch + sp);

      const bg = this.add.graphics();
      const ok = this.isUnlocked(item);
      bg.fillStyle(0x16213e, 1);
      bg.fillRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 12);
      bg.lineStyle(2, ok ? COLORS.SUCCESS : COLORS.GRAY, 1);
      bg.strokeRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 12);

      const icon = this.currentCategory === 'characters' ? '👤' :
                   this.currentCategory === 'vehicles' ? '🚗' : '🏔️';
      this.add.text(cx, cy - 50, icon, { fontSize: '32px' }).setOrigin(0.5);
      this.add.text(cx, cy - 10, item.name, { fontSize: '14px', color: COLORS.WHITE, fontStyle: 'bold' }).setOrigin(0.5);

      if (!ok) {
        this.add.text(cx, cy + 20, '🔒', { fontSize: '20px' }).setOrigin(0.5);
        this.add.text(cx, cy + 45, `${item.cost} ${item.currency === 'diamonds' ? '💎' : '🪙'}`, {
          fontSize: '14px', color: item.currency === 'diamonds' ? COLORS.DIAMOND : COLORS.GOLD
        }).setOrigin(0.5);
        const buyBg = this.add.graphics();
        buyBg.fillStyle(COLORS.PRIMARY, 1);
        buyBg.fillRoundedRect(cx - 50, cy + 60, 100, 30, 6);
        this.add.text(cx, cy + 75, 'BUY', { fontSize: '12px', color: COLORS.WHITE, fontStyle: 'bold' }).setOrigin(0.5);
        this.add.zone(cx, cy + 75, 100, 30).setInteractive().on('pointerup', () => this.buy(item));
      } else {
        this.add.text(cx, cy + 40, '✓ UNLOCKED', { fontSize: '14px', color: COLORS.SUCCESS, fontStyle: 'bold' }).setOrigin(0.5);
      }
    });
  }

  isUnlocked(item) {
    if (this.currentCategory === 'characters') return saveSystem.isCharacterUnlocked(item.id);
    if (this.currentCategory === 'vehicles') return saveSystem.isVehicleUnlocked(item.id);
    return saveSystem.isStageUnlocked(item.id);
  }

  buy(item) {
    const enough = item.currency === 'diamonds' ?
      saveSystem.getDiamonds() >= item.cost : saveSystem.getCoins() >= item.cost;

    if (enough) {
      if (item.currency === 'diamonds') saveSystem.spendDiamonds(item.cost);
      else saveSystem.spendCoins(item.cost);
      if (this.currentCategory === 'characters') saveSystem.unlockCharacter(item.id);
      else if (this.currentCategory === 'vehicles') saveSystem.unlockVehicle(item.id);
      else saveSystem.unlockStage(item.id);
      this.currencyDisplay.update(saveSystem.getCoins(), saveSystem.getDiamonds());
      this.createItems(this.scale.width / 2, this.scale.height / 2 + 20);
    } else {
      this.showMsg('Not enough coins/diamonds!');
    }
  }

  showMsg(msg) {
    const { width, height } = this.scale;
    const ov = this.add.graphics();
    ov.fillStyle(0x000000, 0.8);
    ov.fillRect(0, 0, width, height);
    const bx = this.add.graphics();
    bx.fillStyle(COLORS.DARKER, 1);
    bx.fillRoundedRect(width / 2 - 150, height / 2 - 40, 300, 80, 12);
    bx.lineStyle(2, COLORS.WARNING, 1);
    bx.strokeRoundedRect(width / 2 - 150, height / 2 - 40, 300, 80, 12);
    const t = this.add.text(width / 2, height / 2, msg, { fontSize: '16px', color: COLORS.WARNING }).setOrigin(0.5);
    this.time.delayedCall(1500, () => { ov.destroy(); bx.destroy(); t.destroy(); });
  }
}

export default ShopScene;
