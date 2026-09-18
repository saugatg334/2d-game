import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './constants.js';

export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.DARK,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 980 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    pixelArt: false,
    antialias: true
  },
  input: {
    keyboard: true,
    mouse: true,
    touch: true,
    // P3 Step 7: allow 2 simultaneous touch pointers so GAS can be held while
    // JUMP/BRAKE/REVERSE is pressed with a second finger. Phaser's default is 1
    // touch pointer (plus the mouse pointer), which silently drops the extra
    // finger in InputManager.onTouchStart. Unrelated input config is unchanged.
    activePointers: 2
  }
};
