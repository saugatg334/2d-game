import { COLORS, SCENES, FUEL, GAME_WIDTH } from '../config/constants.js';
import { saveSystem } from '../systems/SaveSystem.js';
import { stages } from '../data/stages.js';
import { characters } from '../data/characters.js';
import { vehicles } from '../data/vehicles.js';
import { Vehicle } from '../game/Vehicle.js';
import { Terrain } from '../game/Terrain.js';
import { Collectibles } from '../game/Collectibles.js';
import { EnvironmentRenderer } from '../game/EnvironmentRenderer.js';
import { resolveVehicleTuning } from '../game/VehicleTuning.js';
import { resolveCharacterAbility } from '../game/CharacterAbility.js';
import { device } from '../utils/device.js';
import { isStagePlayable } from '../game/StageProgression.js';

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

    // P3 Step 3: gameplay-entry guard. A blocked stage must not be enterable
    // even if the StageSelect UI was bypassed. Reuses the same progression
    // helper (plus the existing currency/ownership check via isStagePlayable)
    // that the StageSelect UI uses. Redirects to StageSelect on failure.
    if (!isStagePlayable(this.stage.id, saveSystem)) {
      this.scene.start(SCENES.STAGE_SELECT);
      return;
    }

    const vehicleId = saveSystem.getSelectedVehicle();
    this.vehicleData = vehicles.find(v => v.id === vehicleId) || vehicles[0];
    const characterId = saveSystem.getSelectedCharacter();
    this.characterData = characters.find(c => c.id === characterId) || characters[0];
    this.characterModifiers = {
      stats: this.characterData.stats || {},
      bonuses: this.characterData.bonuses || {}
    };

    // P0 Step 6B: resolve fuel-domain tuning ONCE from vehicle stats + character
    // bonuses (pure resolver, StagePlan-style; never recalculated per frame).
    // Replaces the hardcoded 100 capacity and the FUEL.CONSUMPTION_RATE literal
    // in consumeFuel(). The tempo/default_rider pair resolves to exactly the
    // previous values (capacity 100, base burn 2), so baseline balance is
    // preserved; non-tempo vehicles now honor their existing fuelConsumption data.
    this.vehicleTuning = resolveVehicleTuning(this.vehicleData.stats, this.characterData);

    this.gameState = {
      distance: 0, fuel: this.vehicleTuning.fuelCapacity, coins: 0, diamonds: 0,
      score: 0, speed: 0, isGameOver: false, isPaused: false,
      isComplete: false
    };
    // P3 Step 4: idempotent guard so a single run's collected coins/diamonds
    // are persisted to the player's save at most once (across Game Over, fuel,
    // flip, fall and win paths). Reset every run so Replay/menu starts fresh.
    this.hasBankedRunRewards = false;
    this.flipTimer = 0;
    this.previousFlipRotation = 0;

    // Ability system - only for characters with specialAbility.
    // P0 Step 6H: resolved once through the pure CharacterAbility resolver
    // (StagePlan/VehicleTuning-style). duration/boost values now come from
    // characters.js data instead of GameScene literals; the resolved values
    // are byte-identical to the previous hardcoded ones, so behavior is
    // preserved exactly (available=true only for saugat_legendary).
    this.characterAbility = resolveCharacterAbility(this.characterData);
    this.abilityState = {
      available: this.characterAbility !== null,
      active: false,
      cooldownRemaining: 0,
      activeRemaining: 0,
      config: this.characterAbility ? {
        id: this.characterAbility.id,
        name: this.characterAbility.name,
        cooldown: this.characterAbility.cooldown,
        duration: this.characterAbility.duration
      } : null
    };

    this.controls = { accelerate: false, brake: false, jump: false, reverse: false, tiltLeft: false, tiltRight: false };

    this.terrain = new Terrain(this, this.stage.theme);
    this.terrain.generate(this.stage.targetDistance + 1000);
    this.environmentRenderer = new EnvironmentRenderer(this, this.terrain, this.stage);

    // P0 Step 3: cache stage-specific gravity from the already-resolved plan.
    // Single gravity source — Vehicle.applyGravity() integration is untouched,
    // and with current stage data this equals PHYSICS.GRAVITY (980).
    this.gravity = this.terrain.stagePlan.physics.gravity;

    // Place vehicle on the starting platform
    const startX = 200;
    const startY = this.terrain.getTerrainYAt(startX) - this.vehicleData.stats.wheelRadius - this.vehicleData.stats.height * 0.4;
    this.vehicle = new Vehicle(this, this.vehicleData.stats, startX, startY, {
      vehicleTextureKey: 'vehicle_' + this.vehicleData.id,
      characterTextureKey: 'character_' + this.characterData.id,
      missingAssets: this.missingAssets,
      characterModifiers: this.characterModifiers
    });

    this.collectibles = new Collectibles(this, this.terrain, this.terrain.stagePlan.collectibles);
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

    // Apply temporary boosts to vehicle (P0 Step 6H: data-driven boost
    // factors from the resolved ability config; economy keys intentionally
    // not passed — Vehicle.applyAbilityBoosts has always ignored them).
    this.vehicle.applyAbilityBoosts({
      acceleration: this.characterAbility.boosts.acceleration,
      maxSpeed: this.characterAbility.boosts.maxSpeed,
      airControl: this.characterAbility.boosts.airControl
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
    // P0 Step 6J: guard comment only — behavior identical. The name/description
    // labels are static and colored at creation; only the state text is recolored.
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

    // P0 Step 6J: Ability HUD indicator — surfaces the already-resolved
    // specialAbility metadata (name + description from characters.js via
    // resolveCharacterAbility) above the existing READY/ACTIVE/cooldown text.
    // UI-only: no activation, timing, boost or input behavior is changed.
    // Characters without an ability still get no HUD at all (unchanged).
    if (this.abilityState.available) {
      const abilityName = this.abilityState.config?.name || '';
      const abilityDescription = this.characterAbility?.description || '';
      if (abilityName) {
        this.abilityNameText = this.add.text(w / 2, 18, abilityName, {
          fontSize: '14px', fontStyle: 'bold', color: '#f1c40f', align: 'center'
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1);
      }
      if (abilityDescription) {
        this.abilityDescriptionText = this.add.text(w / 2, 34, abilityDescription, {
          fontSize: '13px', color: '#f1c40f', align: 'center',
          wordWrap: { width: Math.min(520, w - 40) }
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1);
      }
      // Existing state text (READY [Q] / ACTIVE / cooldown) unchanged,
      // shifted down only when metadata is present so it never overlaps.
      this.abilityText = this.add.text(w / 2, 52, '', {
        fontSize: '18px', fontStyle: 'bold', color: '#f1c40f', align: 'center'
      }).setOrigin(0.5).setScrollFactor(0);
    }
  }

  updateFuelBar() {
    this.fuelBar.clear();
    // P0 Step 6B: bar percent now uses the resolved capacity (|| 100 guards any
    // degenerate 0/negative value so the bar can never see NaN).
    const capacity = (this.vehicleTuning && this.vehicleTuning.fuelCapacity) || 100;
    const fp = Math.max(0, this.gameState.fuel);
    const pct = Math.max(0, Math.min(1, fp / capacity));
    let fc = COLORS.SUCCESS;
    if (fp < 30) fc = COLORS.PRIMARY;
    else if (fp < 60) fc = COLORS.WARNING;
    this.fuelBar.fillStyle(fc, 1);
    this.fuelBar.fillRoundedRect(70, 22, 150 * pct, 20, 10);
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
    // P3 Step 12: touch-button sizing compensates for Phaser Scale.FIT shrink.
    // The game renders in a fixed 1280x720 design space; on a narrow (e.g.
    // ~390px) viewport FIT scales that canvas down (~0.3x), making scene-space
    // buttons physically tiny on screen. Font/padding below scale with a
    // compensation factor (1..2.5) derived once from the canvas display size,
    // and every position is clamped so the enlarged buttons stay inside the
    // canvas, keep their original corners/rows, and never overlap each other
    // or the HUD. At desktop display scale (>= 0.6) the factor is exactly 1,
    // so every style/coordinate/hit-area below resolves to the previous
    // layout exactly. UI-only: handlers, readInput(), physics, keyboard
    // controls and Vehicle.reverse()/updateJump() are unchanged.
    // Re-created (debounced) on live resize/orientation change so the factor
    // always matches the current display scale; releases any stuck presses.
    if (this.touchButtons && this.touchButtons.length) {
      this.touchControls.accelerate = false;
      this.touchControls.brake = false;
      this.touchControls.reverse = false;
      this.touchControls.jump = false;
      this.touchControls.tiltLeft = false;
      this.touchControls.tiltRight = false;
      this.touchButtons.forEach(btn => btn.destroy());
    } else {
      this.touchButtons = [];
      this.scale.on('resize', this.handleScaleResize, this);
      this.events.once('shutdown', () => this.scale.off('resize', this.handleScaleResize, this));
    }

    const w = this.scale.width;
    const h = this.scale.height;
    const displayWidth = (this.scale.displaySize && this.scale.displaySize.width > 0)
      ? this.scale.displaySize.width
      : w;
    const displayScale = Math.min(1, displayWidth / GAME_WIDTH);
    const uiCompensation = displayScale >= 0.6 ? 1 : Math.min(2.5, 1 / Math.max(displayScale, 0.01));

    // Larger button style for better visibility (desktop: original values)
    const accelStyle = { fontSize: Math.round(28 * uiCompensation) + 'px', color: '#fff', backgroundColor: '#27ae60', padding: { x: Math.round(25 * uiCompensation), y: Math.round(15 * uiCompensation) } };
    const brakeStyle = { fontSize: Math.round(28 * uiCompensation) + 'px', color: '#fff', backgroundColor: '#c0392b', padding: { x: Math.round(25 * uiCompensation), y: Math.round(15 * uiCompensation) } };
    const tiltStyle = { fontSize: Math.round(20 * uiCompensation) + 'px', color: '#fff', backgroundColor: '#2c3e50', padding: { x: Math.round(15 * uiCompensation), y: Math.round(10 * uiCompensation) } };
    const secondaryStyle = { fontSize: Math.round(22 * uiCompensation) + 'px', color: '#fff', backgroundColor: '#2c3e50', padding: { x: Math.round(18 * uiCompensation), y: Math.round(12 * uiCompensation) } };

    // Accelerator button (bottom right). Position = original spot, clamped so
    // an enlarged button can never leave the canvas (clamp is a no-op at
    // desktop scale where the original spot already fits).
    this.accelBtn = this.add.text(0, 0, 'GAS', accelStyle).setOrigin(0.5).setScrollFactor(0);
    this.accelBtn.x = Math.min(w - 80, w - this.accelBtn.width / 2 - 4);
    this.accelBtn.y = Math.min(h - 70, h - this.accelBtn.height / 2 - 4);
    this.accelBtn.setInteractive({ useHandCursor: true });
    this.accelBtn.on('pointerdown', () => { this.touchControls.accelerate = true; this.accelBtn.setScale(0.9); });
    this.accelBtn.on('pointerup', () => { this.touchControls.accelerate = false; this.accelBtn.setScale(1); });
    this.accelBtn.on('pointerout', () => { this.touchControls.accelerate = false; this.accelBtn.setScale(1); });

    // Brake button (bottom left)
    this.brakeBtn = this.add.text(0, 0, 'BRAKE', brakeStyle).setOrigin(0.5).setScrollFactor(0);
    this.brakeBtn.x = Math.max(80, this.brakeBtn.width / 2 + 4);
    this.brakeBtn.y = Math.min(h - 70, h - this.brakeBtn.height / 2 - 4);
    this.brakeBtn.setInteractive({ useHandCursor: true });
    this.brakeBtn.on('pointerdown', () => { this.touchControls.brake = true; this.brakeBtn.setScale(0.9); });
    this.brakeBtn.on('pointerup', () => { this.touchControls.brake = false; this.brakeBtn.setScale(1); });
    this.brakeBtn.on('pointerout', () => { this.touchControls.brake = false; this.brakeBtn.setScale(1); });

    // REVERSE and JUMP (P3 Step 7) on the second row, above BRAKE / GAS.
    // Original y = h - 165; clamped to stay a clear 12px above the bottom row
    // whenever the enlarged buttons would collide (no-op at desktop scale).
    const bottomRowTop = Math.max(
      this.accelBtn.y - this.accelBtn.height / 2,
      this.brakeBtn.y - this.brakeBtn.height / 2
    );

    // Reverse button (bottom-left area, stacked above BRAKE so it can never overlap it)
    this.reverseBtn = this.add.text(0, 0, 'REVERSE', secondaryStyle).setOrigin(0.5).setScrollFactor(0);
    this.reverseBtn.x = Math.max(80, this.reverseBtn.width / 2 + 4);
    this.reverseBtn.y = Math.min(h - 165, bottomRowTop - 12 - this.reverseBtn.height / 2);
    this.reverseBtn.setInteractive({ useHandCursor: true });
    this.reverseBtn.on('pointerdown', () => { this.touchControls.reverse = true; this.reverseBtn.setScale(0.9); });
    this.reverseBtn.on('pointerup', () => { this.touchControls.reverse = false; this.reverseBtn.setScale(1); });
    this.reverseBtn.on('pointerout', () => { this.touchControls.reverse = false; this.reverseBtn.setScale(1); });

    // Jump button (bottom-right area, stacked above GAS so it can never overlap it)
    this.jumpBtn = this.add.text(0, 0, 'JUMP', secondaryStyle).setOrigin(0.5).setScrollFactor(0);
    this.jumpBtn.x = Math.min(w - 80, w - this.jumpBtn.width / 2 - 4);
    this.jumpBtn.y = Math.min(h - 165, bottomRowTop - 12 - this.jumpBtn.height / 2);
    this.jumpBtn.setInteractive({ useHandCursor: true });
    this.jumpBtn.on('pointerdown', () => { this.touchControls.jump = true; this.jumpBtn.setScale(0.9); });
    this.jumpBtn.on('pointerup', () => { this.touchControls.jump = false; this.jumpBtn.setScale(1); });
    this.jumpBtn.on('pointerout', () => { this.touchControls.jump = false; this.jumpBtn.setScale(1); });

    // Decorative/unwired tilt buttons keep their original mid-edge spots,
    // clamped up only when the enlarged second row would collide with them.
    const aboveRowTop = Math.min(
      this.reverseBtn.y - this.reverseBtn.height / 2,
      this.jumpBtn.y - this.jumpBtn.height / 2
    );

    // Tilt left button (middle left)
    this.tiltLeftBtn = this.add.text(0, 0, '◀', tiltStyle).setOrigin(0.5).setScrollFactor(0);
    this.tiltLeftBtn.x = Math.max(60, this.tiltLeftBtn.width / 2 + 4);
    this.tiltLeftBtn.y = Math.min(h / 2, aboveRowTop - 12 - this.tiltLeftBtn.height / 2);
    this.tiltLeftBtn.setInteractive({ useHandCursor: true });
    this.tiltLeftBtn.on('pointerdown', () => { this.touchControls.tiltLeft = true; this.tiltLeftBtn.setScale(0.9); });
    this.tiltLeftBtn.on('pointerup', () => { this.touchControls.tiltLeft = false; this.tiltLeftBtn.setScale(1); });
    this.tiltLeftBtn.on('pointerout', () => { this.touchControls.tiltLeft = false; this.tiltLeftBtn.setScale(1); });

    // Tilt right button (middle right)
    this.tiltRightBtn = this.add.text(0, 0, '▶', tiltStyle).setOrigin(0.5).setScrollFactor(0);
    this.tiltRightBtn.x = Math.min(w - 60, w - this.tiltRightBtn.width / 2 - 4);
    this.tiltRightBtn.y = Math.min(h / 2, aboveRowTop - 12 - this.tiltRightBtn.height / 2);
    this.tiltRightBtn.setInteractive({ useHandCursor: true });
    this.tiltRightBtn.on('pointerdown', () => { this.touchControls.tiltRight = true; this.tiltRightBtn.setScale(0.9); });
    this.tiltRightBtn.on('pointerup', () => { this.touchControls.tiltRight = false; this.tiltRightBtn.setScale(1); });
    this.tiltRightBtn.on('pointerout', () => { this.touchControls.tiltRight = false; this.tiltRightBtn.setScale(1); });

    this.touchButtons = [this.accelBtn, this.brakeBtn, this.reverseBtn, this.jumpBtn, this.tiltLeftBtn, this.tiltRightBtn];
  }

  // Debounced recreate of touch controls after a display resize/orientation
  // change, so the physical button sizing always matches the current canvas.
  handleScaleResize() {
    if (this.touchResizePending) return;
    this.touchResizePending = true;
    this.time.delayedCall(200, () => {
      this.touchResizePending = false;
      if (this.scene.systems && this.scene.isActive()) this.createTouchControls();
    });
  }

  update(time, delta) {
    if (this.gameState.isGameOver || this.gameState.isPaused || this.gameState.isComplete) return;
    this.readInput();

    const dt = delta / 1000;
    this.updateAbility(dt);

    // P0 Step 6C: ground friction now comes from the resolved vehicle tuning
    // (grip data via VehicleTuning; tempo grip=1 -> exactly 0.96, the previous
    // hardcoded PHYSICS.GROUND_FRICTION). Single application point unchanged:
    // Vehicle.applyFriction(), grounded + not accelerating, exactly one multiply.
    // P0 Step 6E: terrain alignment rate (0.05 x suspension, resolved in
    // VehicleTuning) threaded through exactly like friction; tempo (suspension
    // 1) resolves to exactly the previous hardcoded 0.05.
    this.vehicle.update(this.controls, this.terrain, this.gravity, this.vehicleTuning.groundFriction, delta, this.vehicleTuning.terrainAlignmentRate);

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
      // P0 Step 6B: clamp fuel pickups to the resolved vehicle capacity (was hardcoded 100).
      this.gameState.fuel = Math.min(this.vehicleTuning.fuelCapacity, this.gameState.fuel + rewards.fuel);
    }
    this.consumeFuel(delta);
    this.gameState.distance = this.vehicle.getDistance();
    this.gameState.speed = this.vehicle.getSpeedKmh();
    this.updateHUD();
    this.checkGameConditions();
    this.terrain.generateAhead(this.cameras.main.scrollX);
    this.terrain.cleanup(this.cameras.main.scrollX);
    if (this.environmentRenderer) {
      this.environmentRenderer.update(this.cameras.main.scrollX, this.cameras.main.scrollY);
    }
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
    // P0 Step 6B: base burn now comes from the resolved vehicle tuning
    // (vehicleStats.fuelConsumption, fallback 2 = the old FUEL.CONSUMPTION_RATE).
    // Throttle/coast multipliers, the character fuelEfficiency formula (applied
    // exactly once, pre-resolved) and the min/max clamps are unchanged.
    const baseConsumption = this.vehicleTuning.fuelConsumption;
    const efficiencyFactor = Math.max(0, 1 - this.vehicleTuning.fuelEfficiency);
    // Only consume fuel when accelerating or moving
    if (this.controls.accelerate && this.vehicle.velocityX > 0) {
      const consumption = baseConsumption * dt * FUEL.ACCELERATION_MULTIPLIER * efficiencyFactor;
      this.gameState.fuel = Math.max(0, this.gameState.fuel - consumption);
    } else if (Math.abs(this.vehicle.velocityX) > 1) {
      // Small consumption when moving (coasting)
      const consumption = baseConsumption * dt * 0.1 * efficiencyFactor;
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

  // P3 Step 4: persist this run's collected coins/diamonds exactly once.
  // Safe to call from any loss path (fuel-out, flip, fall). The existing
  // SaveSystem addCoins/addDiamonds are the single persistence mechanism;
  // addCoins(0)/addDiamonds(0) are skipped to avoid an unnecessary save and
  // to keep "zero collected" runs from touching the player's balance.
  bankRunRewards() {
    if (this.hasBankedRunRewards) return false;
    this.hasBankedRunRewards = true;
    if (this.gameState.coins > 0) saveSystem.addCoins(this.gameState.coins);
    if (this.gameState.diamonds > 0) saveSystem.addDiamonds(this.gameState.diamonds);
    return true;
  }

  gameOver(reason) {
    // P3 Step 4: bank run rewards first so they persist whether the player
    // Replays or returns to Menu. The flag makes this a no-op on repeat calls.
    this.bankRunRewards();
    this.gameState.isGameOver = true;
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7).setScrollFactor(0).setDepth(100);
    this.add.text(w / 2, h / 2 - 60, 'GAME OVER', { fontSize: '48px', color: '#e63946', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    this.add.text(w / 2, h / 2, reason, { fontSize: '20px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    this.add.text(w / 2, h / 2 + 30, `Collected: ${this.gameState.coins} 🪙  ${this.gameState.diamonds} 💎`, { fontSize: '16px', color: '#ffd700' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
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
    // P3 Step 4: mark rewards as banked so this run cannot also be banked by a
    // later Game Over path. The win reward behavior above is exactly preserved.
    this.hasBankedRunRewards = true;
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
