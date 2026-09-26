// ============================================
// Nepali Racer - Game Constants
// ============================================

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const COLORS = {
  PRIMARY: '#e63946',
  SECONDARY: '#457b9d',
  ACCENT: '#f4a261',
  SUCCESS: '#2a9d8f',
  WARNING: '#e9c46a',
  DARK: '#1a1a2e',
  DARKER: '#0f0f1a',
  LIGHT: '#f1faee',
  WHITE: '#ffffff',
  BLACK: '#000000',
  GRAY: '#6c757d',
  GOLD: '#ffd700',
  DIAMOND: '#b9f2ff'
};

export const FONTS = {
  PRIMARY: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  HEADING: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
};

export const SCENES = {
  LOADING: 'LoadingScene',
  MAIN_MENU: 'MainMenuScene',
  CHARACTER_SELECT: 'CharacterSelectScene',
  VEHICLE_SELECT: 'VehicleSelectScene',
  STAGE_SELECT: 'StageSelectScene',
  SHOP: 'ShopScene',
  SETTINGS: 'SettingsScene',
  GAME: 'GameScene'
};

export const SAVE_KEY = 'nepali_racer_save';

export const PHYSICS = {
  GRAVITY: 980,
  FRICTION: 0.98,
  GROUND_FRICTION: 0.96,
  // P3 Step 5: reverse + jump mechanics — values scale with each vehicle's
  // own stats so they fit existing physics without altering any vehicle data.
  // Reverse uses a fraction of the vehicle's forward acceleration/maxSpeed,
  // so S/Down first slows toward zero, then drives backward gently and clamps.
  REVERSE_ACCELERATION_MULTIPLIER: 0.6,
  REVERSE_MAX_SPEED_MULTIPLIER: 0.4,
  // Upward impulse (px/s) applied on a grounded player jump; with gravity 980
  // this yields roughly a ~52px arc and leaves the ground via the existing
  // gravity / ground-collision system.
  JUMP_VELOCITY: 320
};

export const VEHICLE_DEFAULTS = {
  maxSpeed: 300,
  acceleration: 120,
  brakeForce: 180,
  mass: 1000,
  width: 80,
  height: 40,
  wheelRadius: 15,
  airRotationSpeed: 2.5
};

// Phase 1.7 (speed/distance unit fix): authoritative world-unit <-> metre
// relationship. Vehicle velocityX is the km/h-like gameplay speed, so one
// world x-unit represents 1/3.6 metres of physical distance:
//   speedKmh = |velocityX|            (Vehicle.getSpeedKmh)
//   metres   = worldXUnits / 3.6      (Vehicle.getDistance, save migration)
// Single source of truth — do NOT duplicate the 3.6 factor elsewhere.
export const WORLD_UNITS_PER_METRE = 3.6;

export const FUEL = {
  MAX: 100,
  // Phase 1.7: legacy per-second burn rate (unit audit). Runtime burn is now
  // derived per metre via FUEL.BURN_PER_METRE = CONSUMPTION_RATE / WORLD_UNITS_PER_METRE
  // (resolved in VehicleTuning); this legacy value is kept for reference only.
  CONSUMPTION_RATE: 2,
  ACCELERATION_MULTIPLIER: 1.5
};

export const SCORE = {
  COIN_VALUE: 10,
  DIAMOND_VALUE: 50,
  DISTANCE_MULTIPLIER: 1,
  COMPLETION_BONUS: 500
};
