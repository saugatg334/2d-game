import { COLORS, SCENES, PHYSICS, FUEL } from '../config/constants.js';
import { saveSystem } from '../systems/SaveSystem.js';
import { stages } from '../data/stages.js';
import { characters } from '../data/characters.js';
import { vehicles } from '../data/vehicles.js';
import { Vehicle } from '../game/Vehicle.js';
import { Terrain } from '../game/Terrain.js';
import { Collectibles } from '../game/Collectibles.js';
import { device } from '../utils/device.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.GAME });
  }

  preload() {
    this.missingAssets = new Set();
    this.load.on('loaderror', file => this.missingAssets.add(file.key));
    const character = characters.find(item => item.id === saveSystem.getSelectedCharacter()) || characters[0];
    const vehicle = vehicles.find(item => item.id === saveSystem.getSelectedVehicle()) || vehicles[0];
    const characterKey = 'character_' + character.id;
    const vehicleKey = 'vehicle_' + vehicle.id;
    if (character.thumbnail && !this.textures.exists(characterKey)) this.load.image(characterKey, character.thumbnail);
    if (vehicle.thumbnail && !this.textures.exists(vehicleKey)) this.load.image(vehicleKey, vehicle.thumbnail);
  }

  create() {
    const stageId = saveSystem.getSelectedStage();
    this.stage = stages.find(s => s.id === stageId) || stages[0];

    const vehicleId = saveSystem.getSelectedVehicle();
    this.vehicleData = vehicles.find(v => v.id === vehicleId) || vehicles[0];
    const characterId = saveSystem.getSelectedCharacter();
    this.characterData = characters.find(c => c.id === characterId) || characters[0];
    this.characterModifiers = {
      stats: this.characterData.stats || {},
      bonuses: this.characterData.bonuses || {}
    };

    this.gameState = {
      distance: 0, fuel: 100, coins: 0, diamonds: 0,
      score: 0, speed: 0, isGameOver: false, isPaused: false,
      isComplete: false
    };
    this.flipTimer = 0;
    this.previousFlipRotation = 0;

    // Ability system - only for characters with specialAbility
    const characterAbility = this.characterData.specialAbility || null;
    this.abilityState = {
      available: characterAbility !== null,
      active: false,
      cooldownRemaining: 0,
      activeRemaining: 0,
      config: characterAbility ? {
        id: characterAbility.id,
        name: characterAbility.name,
        cooldown: characterAbility.cooldown || 45,
        duration: 8
      } : null
    };

    this.controls = { accelerate: false, brake: false, jump: false, reverse: false, tiltLeft: false, tiltRight: false };

    this.terrain = new Terrain(this, this.stage.theme);
    this.terrain.generate(this.stage.targetDistance + 1000);

    // Place vehicle on the starting platform
    const startX = 200;
    const startY = this.terrain.getTerrainYAt(startX) - this.vehicleData.stats.wheelRadius - this.vehicleData.stats.height * 0.4;
    this.vehicle = new Vehicle(this, this.vehicleData.stats, startX, startY, {
      vehicleTextureKey: 'vehicle_' + this.vehicleData.id,
      characterTextureKey: 'character_' + this.characterData.id,
      missingAssets: this.missingAssets,
      characterModifiers: this.characterModifiers
    });

    this.collectibles = new Collectibles(this, this.terrain);
    this.collectibles.generate(this.stage.targetDistance);

    this.cameras.main.setBounds(0, -500, this.terrain.getLength() + 1000, this.scale.height + 500);

    this.createHUD();
    this.createControls();

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  activateAbility() {
    if (!this.abilityState.available || !this.abilityState.config) return;
    if (this.abilityState.active) return;
    if (this.abilityState.cooldownRemaining > 0) return;

    this.abilityState.active = true;
    this.abilityState.activeRemaining = this.abilityState.config.duration;

    // Apply temporary boosts to vehicle
    this.vehicle.applyAbilityBoosts({
      acceleration: 0.5,
      maxSpeed: 0.4,
      fuelEfficiency: 0.5,
      coinBonus: 1.0
    });
  }

  updateAbility(dt) {
    if (!this.abilityState.available) return;

    if (this.abilityState.active) {
      this.abilityState.activeRemaining -= dt;
      if (this.abilityState.activeRemaining <= 0) {
        // Deactivate ability
        this.abilityState.active = false;
        this.abilityState.activeRemaining = 0;
        this.abilityState.cooldownRemaining = this.abilityState.config.cooldown;
        // Revert boosts
        this.vehicle.revertAbilityBoosts();
      }
    } else if (this.abilityState.cooldownRemaining > 0) {
      this.abilityState.cooldownRemaining -= dt;
      if (this.abilityState.cooldownRemaining < 0) {
        this.abilityState.cooldownRemaining = 0;
      }
    }
  }

  getAbilityHUDText() {
    if (!this.abilityState.available) return '';
    if (this.abilityState.active) {
      return `ACTIVE ${this.abilityState.activeRemaining.toFixed(1)}s`;
    } else if (this.abilityState.cooldownRemaining > 0) {
      return `${Math.ceil(this.abilityState.cooldownRemaining)}s`;
    } else {
      return 'READY [Q]';
    }
  }

  getAbilityHUDColor() {
    if (!this.abilityState.available) return '#666';
    if (this.abilityState.active) return '#2ecc71';
    if (this.abilityState.cooldownRemaining > 0) return '#e74c3c';
    return '#f1c40f';
  }

  createHUD() {
    const w = this.scale.width;
    
    // All HUD elements use setScrollFactor(0) to stay fixed on screen
    this.add.text(20, 20, 'Fuel:', { fontSize: '16px', color: '#fff' }).setScrollFactor(0);
    
    this.fuelBarBg = this.add.graphics().setScrollFactor(0);
    this.fuelBarBg.fillStyle(0x333333, 1);
    this.fuelBarBg.fillRoundedRect(70, 22, 150, 20, 10);
    
    this.fuelBar = this.add.graphics().setScrollFactor(0);
    this.updateFuelBar();
    
    this.fuelText = this.add.text(145, 32, '100%', { fontSize: '12px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0);
    this.distanceText = this.add.text(20, 55, 'Distance: 0m / ' + this.stage.targetDistance + 'm', { fontSize: '16px', color: '#fff' }).setScrollFactor(0);
    this.speedText = this.add.text(20, 80, 'Speed: 0 km/h', { fontSize: '16px', color: '#f4a261' }).setScrollFactor(0);
    this.currencyText = this.add.text(w - 150, 20, 'Coins: 0  Diamonds: 0', { fontSize: '16px', color: '#ffd700' }).setScrollFactor(0);
    this.scoreText = this.add.text(w - 150, 50, 'Score: 0', { fontSize: '16px', color: '#fff' }).setScrollFactor(0);
    
    const exitBtn = this.add.text(w - 60, 80, 'X', { fontSize: '24px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
    exitBtn.on('pointerup', () => {
      this.scene.start(SCENES.MAIN_MENU);
    });

    // Ability HUD indicator
    if (this.abilityState.available) {
      this.abilityText = this.add.text(w / 2, 30, '', {
        fontSize: '18px', fontStyle: 'bold', color: '#f1c40f', align: 'center'
      }).setOrigin(0.5).setScrollFactor(0);
    }
  }

  updateFuelBar() {
    this.fuelBar.clear();
    const fp = Math.max(0, this.gameState.fuel);
    let fc = COLORS.SUCCESS;
    if (fp < 30) fc = COLORS.PRIMARY;
    else if (fp < 60) fc = COLORS.WARNING;
    this.fuelBar.fillStyle(fc, 1);
    this.fuelBar.fillRoundedRect(70, 22, 150 * (fp / 100), 20, 10);
  }

  createControls() {
    // Initialize touch controls object (always, to prevent errors)
    this.touchControls = { accelerate: false, brake: false, jump: false, reverse: false, tiltLeft: false, tiltRight: false };
    
    // Safety check for keyboard input
    if (!this.input.keyboard) {
      console.warn('Keyboard input not available, creating dummy controls');
      this.cursors = { up: { isDown: false }, down: { isDown: false }, left: { isDown: false }, right: { isDown: false } };
      this.wasd = {
        jump: { isDown: false },
        reverse: { isDown: false },
        brake: { isDown: false },
        accelerate: { isDown: false }
      };
      this.createTouchControls();
      return;
    }
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      jump: Phaser.Input.Keyboard.KeyCodes.W,
      reverse: Phaser.Input.Keyboard.KeyCodes.S,
      brake: Phaser.Input.Keyboard.KeyCodes.A,
      accelerate: Phaser.Input.Keyboard.KeyCodes.D
    });
    // Ability activation key (Q)
    if (this.abilityState.available) {
      this.input.keyboard.on('keydown-Q', () => this.activateAbility());
    }
    // Always create touch controls (visible on all devices for accessibility)
    this.createTouchControls();
  }

  createTouchControls() {
    const w = this.scale.width;
    const h = this.scale.height;
    
    // Larger button style for better visibility
    const accelStyle = { fontSize: '28px', color: '#fff', backgroundColor: '#27ae60', padding: { x: 25, y: 15 } };
    const brakeStyle = { fontSize: '28px', color: '#fff', backgroundColor: '#c0392b', padding: { x: 25, y: 15 } };
    const tiltStyle = { fontSize: '20px', color: '#fff', backgroundColor: '#2c3e50', padding: { x: 15, y: 10 } };
    
    // Accelerator button (bottom right)
    this.accelBtn = this.add.text(w - 80, h - 70, 'GAS', accelStyle).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.accelBtn.on('pointerdown', () => { this.touchControls.accelerate = true; this.accelBtn.setScale(0.9); });
    this.accelBtn.on('pointerup', () => { this.touchControls.accelerate = false; this.accelBtn.setScale(1); });
    this.accelBtn.on('pointerout', () => { this.touchControls.accelerate = false; this.accelBtn.setScale(1); });
    
    // Brake button (bottom left)
    this.brakeBtn = this.add.text(80, h - 70, 'BRAKE', brakeStyle).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.brakeBtn.on('pointerdown', () => { this.touchControls.brake = true; this.brakeBtn.setScale(0.9); });
    this.brakeBtn.on('pointerup', () => { this.touchControls.brake = false; this.brakeBtn.setScale(1); });
    this.brakeBtn.on('pointerout', () => { this.touchControls.brake = false; this.brakeBtn.setScale(1); });
    
    // Tilt left button (middle left)
    this.tiltLeftBtn = this.add.text(60, h / 2, '◀', tiltStyle).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.tiltLeftBtn.on('pointerdown', () => { this.touchControls.tiltLeft = true; this.tiltLeftBtn.setScale(0.9); });
    this.tiltLeftBtn.on('pointerup', () => { this.touchControls.tiltLeft = false; this.tiltLeftBtn.setScale(1); });
    this.tiltLeftBtn.on('pointerout', () => { this.touchControls.tiltLeft = false; this.tiltLeftBtn.setScale(1); });
    
    // Tilt right button (middle right)
    this.tiltRightBtn = this.add.text(w - 60, h / 2, '▶', tiltStyle).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.tiltRightBtn.on('pointerdown', () => { this.touchControls.tiltRight = true; this.tiltRightBtn.setScale(0.9); });
    this.tiltRightBtn.on('pointerup', () => { this.touchControls.tiltRight = false; this.tiltRightBtn.setScale(1); });
    this.tiltRightBtn.on('pointerout', () => { this.touchControls.tiltRight = false; this.tiltRightBtn.setScale(1); });
  }

  update(time, delta) {
    if (this.gameState.isGameOver || this.gameState.isPaused || this.gameState.isComplete) return;
    this.readInput();

    const dt = delta / 1000;
    this.updateAbility(dt);

    this.vehicle.update(this.controls, this.terrain, PHYSICS.GRAVITY, PHYSICS.GROUND_FRICTION, delta);

    // Update camera to follow vehicle
    const targetScrollX = this.vehicle.x - this.scale.width * 0.3;
    this.cameras.main.scrollX = Math.max(0, targetScrollX);
    this.collectibles.update(time);
    this.collectibles.render(this.cameras.main.scrollX);
    const collected = this.collectibles.checkCollision(this.vehicle);
    if (collected.length > 0) {
      const rewards = this.collectibles.collectItems(collected);
      this.gameState.coins += rewards.coins;
      const coinBonus = this.characterModifiers.bonuses.coinBonus || 0;
      this.gameState.coins += Math.floor(rewards.coins * coinBonus);
      this.gameState.diamonds += rewards.diamonds;
      this.gameState.fuel = Math.min(100, this.gameState.fuel + rewards.fuel);
    }
    this.consumeFuel(delta);
    this.gameState.distance = this.vehicle.getDistance();
    this.gameState.speed = this.vehicle.getSpeedKmh();
    this.updateHUD();
    this.checkGameConditions();
    this.terrain.generateAhead(this.cameras.main.scrollX);
    this.terrain.cleanup(this.cameras.main.scrollX);
  }

  readInput() {
    this.controls.jump = this.cursors.up.isDown || this.wasd.jump.isDown || this.touchControls?.jump === true;
    this.controls.accelerate = this.cursors.right.isDown || this.wasd.accelerate.isDown || this.touchControls?.accelerate === true;
    this.controls.brake = this.cursors.left.isDown || this.wasd.brake.isDown || this.touchControls?.brake === true;
    this.controls.reverse = this.cursors.down.isDown || this.wasd.reverse.isDown || this.touchControls?.reverse === true;
    this.controls.tiltLeft = false;
    this.controls.tiltRight = false;
  }

  consumeFuel(delta) {
    const dt = delta / 1000;
    // Only consume fuel when accelerating or moving
    if (this.controls.accelerate && this.vehicle.velocityX > 0) {
      const fuelEfficiency = this.characterModifiers.bonuses.fuelEfficiency || 0;
      let consumption = FUEL.CONSUMPTION_RATE * dt * FUEL.ACCELERATION_MULTIPLIER * Math.max(0, 1 - fuelEfficiency);
      this.gameState.fuel = Math.max(0, this.gameState.fuel - consumption);
    } else if (Math.abs(this.vehicle.velocityX) > 1) {
      // Small consumption when moving (coasting)
      const fuelEfficiency = this.characterModifiers.bonuses.fuelEfficiency || 0;
      let consumption = FUEL.CONSUMPTION_RATE * dt * 0.1 * Math.max(0, 1 - fuelEfficiency);
      this.gameState.fuel = Math.max(0, this.gameState.fuel - consumption);
    }
    // No fuel consumption when idle
  }

  updateHUD() {
    this.fuelText.setText(Math.floor(this.gameState.fuel) + '%');
    this.updateFuelBar();
    this.distanceText.setText('Distance: ' + Math.floor(this.gameState.distance) + 'm / ' + this.stage.targetDistance + 'm');
    this.speedText.setText('Speed: ' + Math.floor(this.gameState.speed) + ' km/h');
    this.currencyText.setText('Coins: ' + this.gameState.coins + '  Diamonds: ' + this.gameState.diamonds);
    this.scoreText.setText('Score: ' + this.gameState.score);

    // Update ability HUD
    if (this.abilityState.available && this.abilityText) {
      this.abilityText.setText(this.getAbilityHUDText());
      this.abilityText.setColor(this.getAbilityHUDColor());
    }
  }

  checkGameConditions() {
    if (this.gameState.fuel <= 0) { this.gameOver('Out of fuel!'); return; }
    // More forgiving flip detection - require sustained flipping for 3 seconds
    const normalizedRotation = Phaser.Math.Angle.Wrap(this.vehicle.rotation);
    const isBeyondFlipThreshold = Math.abs(normalizedRotation) > (Math.PI / 1.8);
    const previousRotation = this.previousFlipRotation;
    const wasBeyondFlipThreshold = Math.abs(previousRotation) > (Math.PI / 1.8);
    const rotationStep = Math.abs(Phaser.Math.Angle.Wrap(normalizedRotation - previousRotation));
    const isRotationSpike = rotationStep > Math.PI / 3;
    this.previousFlipRotation = normalizedRotation;
    if (isBeyondFlipThreshold && wasBeyondFlipThreshold && !isRotationSpike) {
      this.flipTimer += 1;
    } else {
      this.flipTimer = 0;
    }
    if (this.flipTimer > 180) {
      this.gameOver('Vehicle flipped!');
      return;
    }
    if (this.vehicle.fellOffTrack(this.scale.height)) { this.gameOver('Fell off track!'); return; }
    if (this.gameState.distance >= this.stage.targetDistance) { this.stageComplete(); }
  }

  gameOver(reason) {
    this.gameState.isGameOver = true;
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7).setScrollFactor(0).setDepth(100);
    this.add.text(w / 2, h / 2 - 60, 'GAME OVER', { fontSize: '48px', color: '#e63946', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    this.add.text(w / 2, h / 2, reason, { fontSize: '20px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    const retryBtn = this.add.text(w / 2 - 80, h / 2 + 60, 'RETRY', { fontSize: '20px', color: '#fff', backgroundColor: '#2a9d8f', padding: { x: 20, y: 10 } }).setOrigin(0.5).setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
    retryBtn.on('pointerup', () => this.scene.restart());
    const menuBtn = this.add.text(w / 2 + 80, h / 2 + 60, 'MENU', { fontSize: '20px', color: '#fff', backgroundColor: '#457b9d', padding: { x: 20, y: 10 } }).setOrigin(0.5).setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerup', () => this.scene.start(SCENES.MAIN_MENU));
  }

  stageComplete() {
    this.gameState.isComplete = true;
    const distanceScore = Math.floor(this.gameState.distance);
    const coinScore = this.gameState.coins * 10;
    const diamondScore = this.gameState.diamonds * 50;
    const completionBonus = 500;
    this.gameState.score = distanceScore + coinScore + diamondScore + completionBonus;
    saveSystem.addCoins(this.gameState.coins);
    saveSystem.addDiamonds(this.gameState.diamonds);
    saveSystem.completeStage(this.stage.id);
    saveSystem.updateBestDistance(this.gameState.distance);
    saveSystem.updateBestScore(this.gameState.score);
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7).setScrollFactor(0).setDepth(100);
    this.add.text(w / 2, h / 2 - 80, 'STAGE CLEARED!', { fontSize: '42px', color: '#2a9d8f', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    this.add.text(w / 2, h / 2 - 20, 'Distance: ' + Math.floor(this.gameState.distance) + 'm', { fontSize: '18px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    this.add.text(w / 2, h / 2 + 10, 'Coins: ' + this.gameState.coins + ' | Diamonds: ' + this.gameState.diamonds, { fontSize: '18px', color: '#ffd700' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    this.add.text(w / 2, h / 2 + 40, 'Score: ' + this.gameState.score, { fontSize: '22px', color: '#f4a261', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    const replayBtn = this.add.text(w / 2 - 80, h / 2 + 100, 'REPLAY', { fontSize: '18px', color: '#fff', backgroundColor: '#2a9d8f', padding: { x: 15, y: 8 } }).setOrigin(0.5).setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
    replayBtn.on('pointerup', () => this.scene.restart());
    const menuBtn = this.add.text(w / 2 + 80, h / 2 + 100, 'MENU', { fontSize: '18px', color: '#fff', backgroundColor: '#457b9d', padding: { x: 15, y: 8 } }).setOrigin(0.5).setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerup', () => this.scene.start(SCENES.MAIN_MENU));
  }
}

export default GameScene;
