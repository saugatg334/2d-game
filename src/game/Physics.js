// ============================================
// Nepali Racer - Physics Engine
// ============================================

import { PHYSICS } from '../config/constants.js';

export class Physics {
  constructor(scene) {
    this.scene = scene;
    this.gravity = PHYSICS.GRAVITY;
    this.friction = PHYSICS.FRICTION;
    this.airResistance = PHYSICS.AIR_RESISTANCE;
    this.groundFriction = PHYSICS.GROUND_FRICTION;
  }

  // Apply gravity to vehicle
  applyGravity(vehicle, delta) {
    if (!vehicle.grounded) {
      vehicle.velocityY += this.gravity * delta;
    }
  }

  // Apply engine force (acceleration)
  applyEngineForce(vehicle, direction, delta) {
    const force = vehicle.acceleration * direction * delta;
    vehicle.velocityX += force;

    // Limit to max speed
    if (Math.abs(vehicle.velocityX) > vehicle.maxSpeed) {
      vehicle.velocityX = vehicle.maxSpeed * Math.sign(vehicle.velocityX);
    }
  }

  // Apply brake
  applyBrake(vehicle, delta) {
    const brakeForce = vehicle.brakeForce * delta;

    if (vehicle.velocityX > 0) {
      vehicle.velocityX = Math.max(0, vehicle.velocityX - brakeForce);
    } else if (vehicle.velocityX < 0) {
      vehicle.velocityX = Math.min(0, vehicle.velocityX + brakeForce);
    }
  }

  // Apply friction
  applyFriction(vehicle) {
    if (vehicle.grounded) {
      vehicle.velocityX *= this.groundFriction;
    } else {
      vehicle.velocityX *= this.friction;
    }
  }

  // Apply air resistance
  applyAirResistance(vehicle) {
    vehicle.velocityY *= this.airResistance;
    vehicle.angularVelocity *= 0.98;
  }

  // Apply air rotation
  applyAirRotation(vehicle, direction, delta) {
    if (!vehicle.grounded) {
      vehicle.angularVelocity += direction * vehicle.airRotationSpeed * delta;
    }
  }

  // Update rotation from angular velocity
  updateRotation(vehicle, delta) {
    vehicle.rotation += vehicle.angularVelocity * delta;
  }

  // Check if vehicle is flipped
  isFlipped(vehicle) {
    const angle = Phaser.Math.Angle.Normalize(vehicle.rotation);
    return Math.abs(angle) > Math.PI / 2 && Math.abs(angle) < (3 * Math.PI) / 2;
  }

  // Update vehicle position
  updatePosition(vehicle, delta) {
    vehicle.x += vehicle.velocityX * delta;
    vehicle.y += vehicle.velocityY * delta;
  }

  // Full physics update
  update(vehicle, input, delta) {
    const dt = delta / 1000; // Convert to seconds

    // Apply engine force
    if (input.accelerate) {
      this.applyEngineForce(vehicle, 1, dt);
    }
    if (input.brake) {
      this.applyBrake(vehicle, dt);
    }

    // Apply air rotation
    if (input.tiltLeft) {
      this.applyAirRotation(vehicle, -1, dt);
    }
    if (input.tiltRight) {
      this.applyAirRotation(vehicle, 1, dt);
    }

    // Apply gravity
    this.applyGravity(vehicle, dt);

    // Apply friction and air resistance
    this.applyFriction(vehicle);
    this.applyAirResistance(vehicle);

    // Update rotation
    this.updateRotation(vehicle, dt);

    // Update position
    this.updatePosition(vehicle, dt);
  }

  // Create vehicle physics state
  createVehicleState(stats, x, y) {
    return {
      x: x,
      y: y,
      velocityX: 0,
      velocityY: 0,
      rotation: 0,
      angularVelocity: 0,
      width: stats.width,
      height: stats.height,
      wheelRadius: stats.wheelRadius,
      mass: stats.mass,
      acceleration: stats.acceleration,
      maxSpeed: stats.maxSpeed,
      brakeForce: stats.brakeForce,
      airRotationSpeed: stats.airRotationSpeed,
      grounded: false,
      frontWheel: { x: x + stats.width * 0.3, y: y + stats.height * 0.5 },
      rearWheel: { x: x - stats.width * 0.3, y: y + stats.height * 0.5 }
    };
  }
}

export default Physics;
