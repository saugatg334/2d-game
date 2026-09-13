import { COLORS } from '../config/constants.js';

export class Vehicle {
  constructor(scene, stats, x, y, options = {}) {
    this.scene = scene;
    this.stats = stats;
    this.characterModifiers = options.characterModifiers || {};
    const characterStats = this.characterModifiers.stats || {};
    const characterBonuses = this.characterModifiers.bonuses || {};
    const handling = (typeof characterStats.handling === 'number' ? characterStats.handling : 1)
      * (1 + (characterBonuses.handling || 0));

    this.x = x;
    this.y = y;
    this.velocityX = 0;
    this.velocityY = 0;
    this.rotation = 0;
    this.angularVelocity = 0;
    this.grounded = false;

    this.width = stats.width;
    this.height = stats.height;
    this.wheelRadius = stats.wheelRadius;
    this.mass = stats.mass;
    this.acceleration = stats.acceleration * (1 + (characterBonuses.acceleration || 0));
    this.maxSpeed = stats.maxSpeed * (1 + (characterBonuses.maxSpeed || 0));
    this.brakeForce = stats.brakeForce;
    this.airRotationSpeed = stats.airRotationSpeed * handling * (1 + (characterBonuses.airControl || 0));

    this.frontWheel = { x: 0, y: 0, grounded: false };
    this.rearWheel = { x: 0, y: 0, grounded: false };

    this.flipped = false;
    this.flipTimer = 0;
    this.airTime = 0;

    this.graphics = scene.add.graphics();
    this.wheelGraphics = scene.add.graphics();

    // Store vehicle & character texture info for rendering
    this.vehicleTextureKey = options.vehicleTextureKey || null;
    this.vehicleSprite = null;
    this.characterTextureKey = options.characterTextureKey || null;
    this.characterSprite = null;
    this.missingAssets = options.missingAssets || new Set();

    // Create vehicle sprite if texture is available
    if (this.vehicleTextureKey && scene.textures.exists(this.vehicleTextureKey) && !this.missingAssets.has(this.vehicleTextureKey)) {
      this.vehicleSprite = scene.add.image(0, 0, this.vehicleTextureKey);
      this.vehicleSprite.setOrigin(0.5, 0.5);
      this.vehicleSprite.setDisplaySize(this.width * 1.35, this.height * 1.35);
      this.vehicleSprite.setDepth(5);
    }

    // Create character sprite if texture is available
    if (this.characterTextureKey && scene.textures.exists(this.characterTextureKey) && !this.missingAssets.has(this.characterTextureKey)) {
      this.characterSprite = scene.add.image(0, 0, this.characterTextureKey);
      this.characterSprite.setOrigin(0.5, 0.5);
      this.characterSprite.setScale(0.35);
      this.characterSprite.setDepth(10);
    }

    // Store base stats for ability boosts
    this.baseStats = {
      acceleration: this.acceleration,
      maxSpeed: this.maxSpeed,
      airRotationSpeed: this.airRotationSpeed
    };
    this.abilityBoostsActive = false;

    this.updateWheelPositions();
  }

  applyAbilityBoosts(boosts) {
    if (this.abilityBoostsActive) return;
    this.abilityBoostsActive = true;
    this.acceleration = this.baseStats.acceleration * (1 + (boosts.acceleration || 0));
    this.maxSpeed = this.baseStats.maxSpeed * (1 + (boosts.maxSpeed || 0));
    this.airRotationSpeed = this.baseStats.airRotationSpeed * (1 + (boosts.airControl || 0.3));
  }

  revertAbilityBoosts() {
    if (!this.abilityBoostsActive) return;
    this.abilityBoostsActive = false;
    this.acceleration = this.baseStats.acceleration;
    this.maxSpeed = this.baseStats.maxSpeed;
    this.airRotationSpeed = this.baseStats.airRotationSpeed;
  }

  updateWheelPositions() {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);

    const frontOffsetX = this.width * 0.35;
    const frontOffsetY = this.height * 0.4;
    this.frontWheel.x = this.x + (frontOffsetX * cos - frontOffsetY * sin);
    this.frontWheel.y = this.y + (frontOffsetX * sin + frontOffsetY * cos);

    const rearOffsetX = -this.width * 0.35;
    const rearOffsetY = this.height * 0.4;
    this.rearWheel.x = this.x + (rearOffsetX * cos - rearOffsetY * sin);
    this.rearWheel.y = this.y + (rearOffsetX * sin + rearOffsetY * cos);
  }

  accelerate(delta) {
    this.velocityX += this.acceleration * delta;
    if (this.velocityX > this.maxSpeed) this.velocityX = this.maxSpeed;
  }

  brake(delta) {
    const bf = this.brakeForce * delta;
    if (this.velocityX > 0) this.velocityX = Math.max(0, this.velocityX - bf);
    else if (this.velocityX < 0) this.velocityX = Math.min(0, this.velocityX + bf);
  }

  applyGravity(gravity, delta) {
    if (!this.grounded) this.velocityY += gravity * delta;
  }

  applyFriction(friction, accelerating = false) {
    if (this.grounded && !accelerating) this.velocityX *= friction;
  }

  rotateAir(direction, delta) {
    if (!this.grounded) this.angularVelocity += direction * this.airRotationSpeed * delta;
  }

  updateRotation(delta) {
    this.rotation += this.angularVelocity * delta;
    this.angularVelocity *= 0.98;
  }

  updatePosition(delta) {
    this.x += this.velocityX * delta;
    this.y += this.velocityY * delta;
    this.updateWheelPositions();
  }

  checkGroundCollision(terrain) {
    const frontTerrainY = terrain.getTerrainYAt(this.frontWheel.x);
    const rearTerrainY = terrain.getTerrainYAt(this.rearWheel.x);
    const frontContactY = frontTerrainY - this.wheelRadius;
    const rearContactY = rearTerrainY - this.wheelRadius;

    this.frontWheel.grounded = this.frontWheel.y >= frontContactY;
    this.rearWheel.grounded = this.rearWheel.y >= rearContactY;

    this.grounded = this.frontWheel.grounded || this.rearWheel.grounded;

    if (this.grounded) {
      // Align only from the two actual wheel contacts. One-wheel contact can
      // happen at a segment transition and must not rotate the whole vehicle.
      if (this.frontWheel.grounded && this.rearWheel.grounded) {
        const wheelSpan = this.frontWheel.x - this.rearWheel.x;
        const hasValidWheelOrder = wheelSpan > this.width * 0.25;
        if (hasValidWheelOrder) {
          const terrainAngle = Math.atan2(frontContactY - rearContactY, wheelSpan);
          const hasValidTerrainAngle = Math.abs(terrainAngle) < Math.PI / 2;
          const angleDifference = Math.abs(Phaser.Math.Angle.Wrap(terrainAngle - this.rotation));
          const hasStableAngleDifference = angleDifference < Math.PI / 4;
          if (hasValidTerrainAngle && hasStableAngleDifference) {
            this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, terrainAngle, 0.05);
            this.y = (frontContactY + rearContactY) / 2 - this.height * 0.4;
            this.updateWheelPositions();
          }
        }
        this.angularVelocity *= 0.8;
      }

      this.velocityY = 0;
      this.airTime = 0;
    } else {
      this.airTime += 1;
    }
    this.checkFlipped();
  }

  checkFlipped() {
    const normalizedAngle = Phaser.Math.Angle.Normalize(this.rotation);
    // More forgiving flip threshold - only count as flipped beyond ~100 degrees
    this.flipped = Math.abs(normalizedAngle) > (Math.PI / 1.8);
    if (this.flipped) this.flipTimer += 1;
    else this.flipTimer = 0;
  }

  fellOffTrack(screenHeight) {
    return this.y > screenHeight + 200;
  }

  getSpeedKmh() {
    return Math.abs(this.velocityX) * 0.36;
  }

  getDistance() {
    return Math.max(0, this.x - 200);
  }

  render() {
    this.graphics.clear();
    this.wheelGraphics.clear();

    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const hw = this.width / 2;
    const hh = this.height / 2;

    const rotatePoint = (px, py) => ({
      x: this.x + (px * cos - py * sin),
      y: this.y + (px * sin + py * cos)
    });

    // Update character sprite position to follow vehicle
    if (this.characterSprite) {
      const driverPos = rotatePoint(-hw * 0.05, -hh * 0.5);
      this.characterSprite.setPosition(driverPos.x, driverPos.y);
      this.characterSprite.setRotation(this.rotation);
    }

    // Draw shadow
    this.graphics.fillStyle(0x000000, 0.3);
    this.graphics.fillEllipse(this.x, this.y + hh + 8, this.width * 1.2, 12);

    const hasSprite = this.vehicleSprite && this.scene.textures.exists(this.vehicleTextureKey) && !this.missingAssets.has(this.vehicleTextureKey);

    if (hasSprite) {
      this.vehicleSprite.setPosition(this.x, this.y);
      this.vehicleSprite.setRotation(this.rotation);
      this.vehicleSprite.setVisible(true);
    } else {
      // Draw exhaust pipe
      const exhaustPos = rotatePoint(-hw * 0.9, hh * 0.2);
      this.graphics.fillStyle(0x444444, 1);
      this.graphics.fillCircle(exhaustPos.x, exhaustPos.y, 6);
      this.graphics.fillStyle(0x333333, 1);
      this.graphics.fillCircle(exhaustPos.x, exhaustPos.y, 4);

      // Draw suspension arms
      this.graphics.lineStyle(6, 0x333333, 1);
      const frontSusTop = rotatePoint(hw * 0.15, hh * 0.6);
      const frontWheelCenter = rotatePoint(hw * 0.75, hh + this.wheelRadius * 0.3);
      this.graphics.beginPath();
      this.graphics.moveTo(frontSusTop.x, frontSusTop.y);
      this.graphics.lineTo(frontWheelCenter.x, frontWheelCenter.y);
      this.graphics.strokePath();
      const rearSusTop = rotatePoint(-hw * 0.15, hh * 0.6);
      const rearWheelCenter = rotatePoint(-hw * 0.75, hh + this.wheelRadius * 0.3);
      this.graphics.beginPath();
      this.graphics.moveTo(rearSusTop.x, rearSusTop.y);
      this.graphics.lineTo(rearWheelCenter.x, rearWheelCenter.y);
      this.graphics.strokePath();

      // Draw chassis
      const chassisCorners = [
        { x: -hw * 0.9, y: hh * 0.8 },
        { x: hw * 0.9, y: hh * 0.8 },
        { x: hw * 0.85, y: -hh * 0.1 },
        { x: -hw * 0.85, y: -hh * 0.1 }
      ].map(c => rotatePoint(c.x, c.y));
      this.graphics.fillStyle(0x2c3e50, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(chassisCorners[0].x, chassisCorners[0].y);
      for (let i = 1; i < chassisCorners.length; i++) {
        this.graphics.lineTo(chassisCorners[i].x, chassisCorners[i].y);
      }
      this.graphics.closePath();
      this.graphics.fillPath();

      // Draw main body
      const bodyCorners = [
        { x: -hw * 0.85, y: hh * 0.5 },
        { x: hw * 0.85, y: hh * 0.5 },
        { x: hw * 0.75, y: -hh * 0.3 },
        { x: -hw * 0.75, y: -hh * 0.3 }
      ].map(c => rotatePoint(c.x, c.y));
      this.graphics.fillStyle(0xc0392b, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(bodyCorners[0].x, bodyCorners[0].y);
      for (let i = 1; i < bodyCorners.length; i++) {
        this.graphics.lineTo(bodyCorners[i].x, bodyCorners[i].y);
      }
      this.graphics.closePath();
      this.graphics.fillPath();

      // Body highlight
      const bodyHighlight = [
        { x: -hw * 0.6, y: hh * 0.3 },
        { x: hw * 0.6, y: hh * 0.3 },
        { x: hw * 0.55, y: -hh * 0.1 },
        { x: -hw * 0.55, y: -hh * 0.1 }
      ].map(c => rotatePoint(c.x, c.y));
      this.graphics.fillStyle(0xe74c3c, 0.5);
      this.graphics.beginPath();
      this.graphics.moveTo(bodyHighlight[0].x, bodyHighlight[0].y);
      for (let i = 1; i < bodyHighlight.length; i++) {
        this.graphics.lineTo(bodyHighlight[i].x, bodyHighlight[i].y);
      }
      this.graphics.closePath();
      this.graphics.fillPath();

      // Draw hood
      const hoodCorners = [
        { x: hw * 0.35, y: hh * 0.4 },
        { x: hw * 0.8, y: hh * 0.35 },
        { x: hw * 0.7, y: -hh * 0.4 },
        { x: hw * 0.4, y: -hh * 0.45 }
      ].map(c => rotatePoint(c.x, c.y));
      this.graphics.fillStyle(0xe74c3c, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(hoodCorners[0].x, hoodCorners[0].y);
      for (let i = 1; i < hoodCorners.length; i++) {
        this.graphics.lineTo(hoodCorners[i].x, hoodCorners[i].y);
      }
      this.graphics.closePath();
      this.graphics.fillPath();

      // Hood scoop
      const hoodScoop = rotatePoint(hw * 0.55, -hh * 0.05);
      this.graphics.fillStyle(0x1a1a1a, 1);
      this.graphics.fillRoundedRect(hoodScoop.x - 10, hoodScoop.y - 4, 20, 8, 3);

      // Draw cabin
      const cabinCorners = [
        { x: -hw * 0.5, y: -hh * 0.25 },
        { x: hw * 0.35, y: -hh * 0.25 },
        { x: hw * 0.3, y: -hh * 0.85 },
        { x: -hw * 0.45, y: -hh * 0.85 }
      ].map(c => rotatePoint(c.x, c.y));
      this.graphics.fillStyle(0x1a252f, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(cabinCorners[0].x, cabinCorners[0].y);
      for (let i = 1; i < cabinCorners.length; i++) {
        this.graphics.lineTo(cabinCorners[i].x, cabinCorners[i].y);
      }
      this.graphics.closePath();
      this.graphics.fillPath();

      // Draw windshield
      const windshieldCorners = [
        { x: hw * 0.15, y: -hh * 0.3 },
        { x: hw * 0.28, y: -hh * 0.78 },
        { x: -hw * 0.1, y: -hh * 0.78 },
        { x: -hw * 0.15, y: -hh * 0.3 }
      ].map(c => rotatePoint(c.x, c.y));
      this.graphics.fillStyle(0x85c1e9, 0.85);
      this.graphics.beginPath();
      this.graphics.moveTo(windshieldCorners[0].x, windshieldCorners[0].y);
      for (let i = 1; i < windshieldCorners.length; i++) {
        this.graphics.lineTo(windshieldCorners[i].x, windshieldCorners[i].y);
      }
      this.graphics.closePath();
      this.graphics.fillPath();

      // Windshield reflection
      const windshieldReflect = [
        { x: hw * 0.2, y: -hh * 0.4 },
        { x: hw * 0.25, y: -hh * 0.6 },
        { x: hw * 0.1, y: -hh * 0.6 },
        { x: hw * 0.08, y: -hh * 0.4 }
      ].map(c => rotatePoint(c.x, c.y));
      this.graphics.fillStyle(0xffffff, 0.3);
      this.graphics.beginPath();
      this.graphics.moveTo(windshieldReflect[0].x, windshieldReflect[0].y);
      for (let i = 1; i < windshieldReflect.length; i++) {
        this.graphics.lineTo(windshieldReflect[i].x, windshieldReflect[i].y);
      }
      this.graphics.closePath();
      this.graphics.fillPath();

      // Draw rear window
      const rearWindowCorners = [
        { x: -hw * 0.2, y: -hh * 0.3 },
        { x: -hw * 0.1, y: -hh * 0.78 },
        { x: -hw * 0.4, y: -hh * 0.78 },
        { x: -hw * 0.4, y: -hh * 0.3 }
      ].map(c => rotatePoint(c.x, c.y));
      this.graphics.fillStyle(0x85c1e9, 0.7);
      this.graphics.beginPath();
      this.graphics.moveTo(rearWindowCorners[0].x, rearWindowCorners[0].y);
      for (let i = 1; i < rearWindowCorners.length; i++) {
        this.graphics.lineTo(rearWindowCorners[i].x, rearWindowCorners[i].y);
      }
      this.graphics.closePath();
      this.graphics.fillPath();

      // Draw driver head (only if no character sprite)
      if (!this.characterSprite) {
        const driverHead = rotatePoint(-hw * 0.05, -hh * 0.6);
        this.graphics.fillStyle(0xf5cba7, 1);
        this.graphics.fillCircle(driverHead.x, driverHead.y, 10);
        this.graphics.fillStyle(0xe74c3c, 1);
        this.graphics.beginPath();
        this.graphics.arc(driverHead.x, driverHead.y - 3, 11, Math.PI, 0);
        this.graphics.fillPath();
        this.graphics.fillStyle(0x2c3e50, 0.8);
        this.graphics.beginPath();
        this.graphics.arc(driverHead.x + 2, driverHead.y - 2, 8, -Math.PI * 0.8, Math.PI * 0.2);
        this.graphics.fillPath();
      }

      // Draw headlights
      const headlightPos = rotatePoint(hw * 0.82, -hh * 0.2);
      this.graphics.fillStyle(0xf1c40f, 1);
      this.graphics.fillCircle(headlightPos.x, headlightPos.y, 7);
      this.graphics.fillStyle(0xfff9c4, 0.8);
      this.graphics.fillCircle(headlightPos.x, headlightPos.y, 4);
      this.graphics.fillStyle(0xffffff, 0.5);
      this.graphics.fillCircle(headlightPos.x - 1, headlightPos.y - 1, 2);

      const headlight2Pos = rotatePoint(hw * 0.82, hh * 0.15);
      this.graphics.fillStyle(0xf1c40f, 1);
      this.graphics.fillCircle(headlight2Pos.x, headlight2Pos.y, 6);
      this.graphics.fillStyle(0xfff9c4, 0.8);
      this.graphics.fillCircle(headlight2Pos.x, headlight2Pos.y, 3);

      // Draw taillights
      const taillightPos = rotatePoint(-hw * 0.85, -hh * 0.1);
      this.graphics.fillStyle(0xc0392b, 1);
      this.graphics.fillCircle(taillightPos.x, taillightPos.y, 5);
      this.graphics.fillStyle(0xff6b6b, 0.6);
      this.graphics.fillCircle(taillightPos.x, taillightPos.y, 3);

      // Draw bumpers
      this.graphics.lineStyle(5, 0x7f8c8d, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(rotatePoint(hw * 0.7, hh * 0.65).x, rotatePoint(hw * 0.7, hh * 0.65).y);
      this.graphics.lineTo(rotatePoint(hw * 0.92, hh * 0.55).x, rotatePoint(hw * 0.92, hh * 0.55).y);
      this.graphics.strokePath();
      this.graphics.beginPath();
      this.graphics.moveTo(rotatePoint(-hw * 0.7, hh * 0.65).x, rotatePoint(-hw * 0.7, hh * 0.65).y);
      this.graphics.lineTo(rotatePoint(-hw * 0.92, hh * 0.55).x, rotatePoint(-hw * 0.92, hh * 0.55).y);
      this.graphics.strokePath();

      // Draw roll cage
      this.graphics.lineStyle(2, 0x7f8c8d, 0.8);
      const rackFront = rotatePoint(hw * 0.25, -hh * 0.8);
      const rackRear = rotatePoint(-hw * 0.35, -hh * 0.8);
      this.graphics.beginPath();
      this.graphics.moveTo(rackFront.x, rackFront.y);
      this.graphics.lineTo(rackRear.x, rackRear.y);
      this.graphics.strokePath();
    }

    // Draw wheels
    this.drawWheel(this.frontWheel.x, this.frontWheel.y, this.wheelRadius);
    this.drawWheel(this.rearWheel.x, this.rearWheel.y, this.wheelRadius);
  }

  drawWheel(wheelX, wheelY, radius) {
    this.wheelGraphics.fillStyle(0x1a1a1a, 1);
    this.wheelGraphics.fillCircle(wheelX, wheelY, radius);
    
    this.wheelGraphics.lineStyle(2, 0x333333, 1);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + (this.x * 0.15);
      const innerX = wheelX + Math.cos(angle) * (radius * 0.7);
      const innerY = wheelY + Math.sin(angle) * (radius * 0.7);
      const outerX = wheelX + Math.cos(angle) * (radius * 0.95);
      const outerY = wheelY + Math.sin(angle) * (radius * 0.95);
      this.wheelGraphics.beginPath();
      this.wheelGraphics.moveTo(innerX, innerY);
      this.wheelGraphics.lineTo(outerX, outerY);
      this.wheelGraphics.strokePath();
    }
    
    this.wheelGraphics.fillStyle(0x95a5a6, 1);
    this.wheelGraphics.fillCircle(wheelX, wheelY, radius * 0.6);
    this.wheelGraphics.fillStyle(0x7f8c8d, 1);
    this.wheelGraphics.fillCircle(wheelX, wheelY, radius * 0.5);
    this.wheelGraphics.fillStyle(0xbdc3c7, 1);
    this.wheelGraphics.fillCircle(wheelX, wheelY, radius * 0.25);
    this.wheelGraphics.fillStyle(0x95a5a6, 1);
    this.wheelGraphics.fillCircle(wheelX, wheelY, radius * 0.15);
    
    this.wheelGraphics.lineStyle(3, 0x7f8c8d, 1);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + (this.x * 0.15);
      const spokeX = wheelX + Math.cos(angle) * (radius * 0.5);
      const spokeY = wheelY + Math.sin(angle) * (radius * 0.5);
      this.wheelGraphics.beginPath();
      this.wheelGraphics.moveTo(wheelX, wheelY);
      this.wheelGraphics.lineTo(spokeX, spokeY);
      this.wheelGraphics.strokePath();
    }
  }

  update(input, terrain, gravity, friction, delta) {
    const dt = delta / 1000;

    if (input.accelerate) this.accelerate(dt);
    if (input.brake) this.brake(dt);
    if (input.tiltLeft) this.rotateAir(-1, dt);
    if (input.tiltRight) this.rotateAir(1, dt);

    this.applyGravity(gravity, dt);
    this.applyFriction(friction, input.accelerate);
    this.updateRotation(dt);
    this.updatePosition(dt);
    this.checkGroundCollision(terrain);
    this.render();
  }

  destroy() {
    this.graphics.destroy();
    this.wheelGraphics.destroy();
    if (this.vehicleSprite) {
      this.vehicleSprite.destroy();
    }
    if (this.characterSprite) {
      this.characterSprite.destroy();
    }
  }
}

export default Vehicle;
