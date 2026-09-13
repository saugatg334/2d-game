// ============================================
// Nepali Racer - Collectibles System
// ============================================

export class Collectibles {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.items = [];
    this.graphics = scene.add.graphics();

    // Collectible types
    this.types = {
      coin: { emoji: '🪙', value: 1, color: 0xffd700 },
      diamond: { emoji: '💎', value: 1, color: 0xb9f2ff },
      fuel: { emoji: '⛽', value: 25, color: 0x2a9d8f }
    };
  }

  // Spawn collectibles along the terrain
  generate(targetDistance) {
    this.items = [];
    const startX = 500;
    const endX = targetDistance;

    for (let x = startX; x < endX; x += 100 + Math.random() * 200) {
      const rand = Math.random();
      let type;

      if (rand < 0.7) type = 'coin';
      else if (rand < 0.9) type = 'fuel';
      else type = 'diamond';

      const terrainY = this.terrain.getTerrainYAt(x);
      const y = terrainY - 30 - Math.random() * 50;

      this.items.push({
        x: x,
        y: y,
        type: type,
        collected: false,
        bobOffset: Math.random() * Math.PI * 2
      });
    }
  }

  // Check collision with vehicle
  checkCollision(vehicle) {
    const collected = [];

    for (const item of this.items) {
      if (item.collected) continue;

      const dx = vehicle.x - item.x;
      const dy = vehicle.y - item.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 40) {
        item.collected = true;
        collected.push(item);
      }
    }

    return collected;
  }

  // Update collectibles (bobbing animation)
  update(time) {
    for (const item of this.items) {
      if (item.collected) continue;
      // Bob up and down
      item.currentY = item.y + Math.sin(time * 0.003 + item.bobOffset) * 5;
    }
  }

  // Render collectibles
  render(cameraX) {
    this.graphics.clear();

    const viewLeft = cameraX - 100;
    const viewRight = cameraX + this.scene.scale.width + 100;

    for (const item of this.items) {
      if (item.collected) continue;
      if (item.x < viewLeft || item.x > viewRight) continue;

      const type = this.types[item.type];
      const y = item.currentY || item.y;

      // Glow effect
      this.graphics.fillStyle(type.color, 0.3);
      this.graphics.fillCircle(item.x, y, 20);

      // Item circle
      this.graphics.fillStyle(type.color, 1);
      this.graphics.fillCircle(item.x, y, 12);

      // Emoji
      // Note: Canvas doesn't support emoji well, so we draw a simple symbol
      this.graphics.fillStyle(0x000000, 0.8);
      this.graphics.fillCircle(item.x, y, 6);
    }
  }

  // Remove collected items and return rewards
  collectItems(items) {
    const rewards = { coins: 0, diamonds: 0, fuel: 0 };

    for (const item of items) {
      if (item.type === 'coin') rewards.coins += this.types.coin.value;
      else if (item.type === 'diamond') rewards.diamonds += this.types.diamond.value;
      else if (item.type === 'fuel') rewards.fuel += this.types.fuel.value;
    }

    return rewards;
  }

  // Cleanup items behind camera
  cleanup(cameraX) {
    const removeBefore = cameraX - 500;
    this.items = this.items.filter(item => item.x > removeBefore);
  }

  // Destroy
  destroy() {
    this.graphics.destroy();
  }
}

export default Collectibles;
