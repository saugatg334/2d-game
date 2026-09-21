// ============================================
// Nepali Racer - Main Entry Coordinator
// ============================================
// Thin entry/coordinator. The official game entry is now the website's PLAY NOW
// buttons, which call startGame() (from src/game/bootstrap.js). Phaser does NOT
// auto-start — not even in development. startGame() is idempotent and is the
// ONLY place a Phaser.Game is created.

export { startGame } from './game/bootstrap.js';
