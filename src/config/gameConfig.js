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
    touch: true
  }
};
