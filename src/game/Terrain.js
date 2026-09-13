// ============================================
// Nepali Racer - Procedural Terrain
// ============================================

export class Terrain {
  constructor(scene, theme) {
    this.scene = scene;
    this.theme = theme;
    this.segments = [];
    this.segmentWidth = 100;
    this.totalDistance = 0;
    this.graphics = scene.add.graphics();
    this.groundY = scene.scale.height - 100;
    this.startX = 0;
    this.endX = 0;
  }

  // Generate initial terrain
  generate(targetDistance) {
    this.segments = [];
    this.totalDistance = 0;

    // Flat starting platform
    this.addSegment(0, this.groundY, 400, this.groundY, true);

    // Generate terrain until we reach target distance
    let currentX = 400;
    while (currentX < targetDistance + 2000) {
      this.generateNextSegment(currentX);
      currentX += this.segmentWidth;
    }

    this.render();
  }

  // Generate next terrain segment
  generateNextSegment(startX) {
    const prevSegment = this.segments[this.segments.length - 1];
    const prevY = prevSegment ? prevSegment.endY : this.groundY;

    const isFastTrack = this.scene.stage && (this.scene.stage.id === 'ktm_nijgadh_fast_track' || this.scene.stage.environment === 'fast_track');
    
    if (isFastTrack) {
      // Deterministic section-based Fast Track terrain profile (2500m total distance)
      const endX = startX + this.segmentWidth;
      let endY = this.groundY;

      if (endX <= 250) {
        // Section 1: valley_start (0m - 250m) -> Flat level platform
        endY = this.groundY;
      } else if (endX <= 600) {
        // Section 2: hill_climb (250m - 600m) -> Smooth climbing slope up to -80px
        const t = (endX - 250) / 350;
        endY = this.groundY - t * 80;
      } else if (endX <= 900) {
        // Section 3: expressway (600m - 900m) -> Gentle rolling hill expressway
        const t = (endX - 600) / 300;
        endY = (this.groundY - 80) + Math.sin(t * Math.PI) * 40;
      } else if (endX <= 1150) {
        // Section 4: bridge (900m - 1150m) -> Flat level viaduct bridge deck (Slope 0)
        endY = this.groundY - 40;
      } else if (endX <= 1300) {
        // Section 5: tunnel_approach (1150m - 1300m) -> Gentle transition down to -20px
        const t = (endX - 1150) / 150;
        endY = (this.groundY - 40) + t * 20;
      } else if (endX <= 1600) {
        // Section 6: tunnel (1300m - 1600m) -> Flat level tunnel floor (Slope 0)
        endY = this.groundY - 20;
      } else if (endX <= 1750) {
        // Section 7: tunnel_exit (1600m - 1750m) -> Gentle transition up to -50px
        const t = (endX - 1600) / 150;
        endY = (this.groundY - 20) - t * 30;
      } else if (endX <= 2050) {
        // Section 8: hill_expressway (1750m - 2050m) -> Makwanpur hill expressway curve
        const t = (endX - 1750) / 300;
        endY = (this.groundY - 50) + Math.sin(t * Math.PI) * 30;
      } else if (endX <= 2350) {
        // Section 9: terai_transition (2050m - 2350m) -> Gradual descent to Terai plains
        const t = (endX - 2050) / 300;
        endY = (this.groundY - 20) + t * 20;
      } else {
        // Section 10: nijgadh_finish (2350m - 2500m+) -> Flat level finish platform
        endY = this.groundY;
      }

      this.addSegment(startX, prevY, endX, endY, false);
      return;
    }

    // Random terrain type for other procedural stages - gentler slopes for better gameplay
    const rand = Math.random();
    let endY, type;

    // Max slope: ~25 degrees (50px over 100px horizontal)
    const maxSlope = 50;

    if (rand < 0.35) {
      // Flat - more common for stability
      endY = prevY;
      type = 'flat';
    } else if (rand < 0.55) {
      // Hill up - gentle slope
      endY = prevY - 15 - Math.random() * 35;
      type = 'hillUp';
    } else if (rand < 0.75) {
      // Hill down - gentle slope
      endY = prevY + 15 + Math.random() * 35;
      type = 'hillDown';
    } else if (rand < 0.88) {
      // Ramp - moderate jump
      endY = prevY - 20 - Math.random() * 30;
      type = 'ramp';
    } else {
      // Valley - gentle dip
      endY = prevY + 20 + Math.random() * 25;
      type = 'valley';
    }

    // Clamp Y values - limit max height change for smoother terrain
    const maxRise = maxSlope;
    const maxDrop = maxSlope;
    endY = Phaser.Math.Clamp(endY, prevY - maxRise, prevY + maxDrop);
    endY = Phaser.Math.Clamp(endY, this.groundY - 150, this.groundY + 80);

    this.addSegment(startX, prevY, startX + this.segmentWidth, endY, false);
  }

  // Add a terrain segment
  addSegment(startX, startY, endX, endY, isFlat) {
    this.segments.push({
      startX,
      startY,
      endX,
      endY,
      isFlat,
      type: isFlat ? 'flat' : 'generated'
    });
    this.endX = endX;
  }

  // Get terrain Y at a given X position
  getTerrainYAt(x) {
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      if (x >= seg.startX && x < seg.endX) {
        // Interpolate Y
        const t = (x - seg.startX) / (seg.endX - seg.startX);
        return seg.startY + (seg.endY - seg.startY) * t;
      }
    }
    return this.groundY;
  }

  // Get terrain angle at a given X position
  getTerrainAngleAt(x) {
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      if (x >= seg.startX && x < seg.endX) {
        const dx = seg.endX - seg.startX;
        const dy = seg.endY - seg.startY;
        return Math.atan2(dy, dx);
      }
    }
    return 0;
  }

  // Check if point is on ground
  isOnGround(x, y, threshold = 10) {
    const terrainY = this.getTerrainYAt(x);
    return y >= terrainY - threshold && y <= terrainY + threshold;
  }

  // Generate more terrain ahead
  generateAhead(cameraX) {
    const lookAhead = cameraX + 3000;
    while (this.endX < lookAhead) {
      this.generateNextSegment(this.endX);
    }
    this.render();
  }

  // Remove old terrain behind camera
  cleanup(cameraX) {
    const removeBefore = cameraX - 1000;
    while (this.segments.length > 0 && this.segments[0].endX < removeBefore) {
      this.segments.shift();
    }
  }

  // Render terrain
  render() {
    this.graphics.clear();

    const groundColor = this.theme ? parseInt(this.theme.groundColor.replace('#', '0x')) : 0x8b4513;
    const hillColor = this.theme ? parseInt(this.theme.hillColor.replace('#', '0x')) : 0x4a7c59;
    const mountainColor = this.theme ? parseInt(this.theme.mountainColor.replace('#', '0x')) : 0x6b8e23;
    const accentColor = this.theme ? parseInt(this.theme.accentColor.replace('#', '0x')) : 0x228b22;

    // Draw mountains and hills only if NOT an expressway/fast_track (handled by EnvironmentRenderer)
    const isExpressway = this.theme && (this.theme.environment === 'fast_track' || this.theme.environment === 'highway');
    if (!isExpressway) {
      // Draw mountains in far background
      this.graphics.fillStyle(mountainColor, 0.3);
      for (let i = 0; i < this.segments.length; i += 4) {
        const seg = this.segments[i];
        const mh = 120 + Math.sin(seg.startX * 0.005) * 60;
        this.graphics.fillTriangle(
          seg.startX - 50, seg.startY + 50,
          seg.startX + 80, seg.startY - mh,
          seg.startX + 200, seg.startY + 50
        );
      }

      // Draw hills in background
      this.graphics.fillStyle(hillColor, 0.5);
      for (let i = 0; i < this.segments.length; i += 3) {
        const seg = this.segments[i];
        const hillHeight = 60 + Math.sin(seg.startX * 0.01) * 35;
        this.graphics.fillTriangle(
          seg.startX - 30, seg.startY + 20,
          seg.startX + 50, seg.startY - hillHeight,
          seg.startX + 120, seg.startY + 20
        );
      }
    }

    // Draw ground fill (main terrain body)
    this.graphics.fillStyle(groundColor, 1);
    if (this.segments.length > 0) {
      this.graphics.beginPath();
      this.graphics.moveTo(this.segments[0].startX, this.segments[0].startY);
      for (const seg of this.segments) {
        this.graphics.lineTo(seg.endX, seg.endY);
      }
      this.graphics.lineTo(this.segments[this.segments.length - 1].endX, this.scene.scale.height + 50);
      this.graphics.lineTo(this.segments[0].startX, this.scene.scale.height + 50);
      this.graphics.closePath();
      this.graphics.fillPath();
    }

    const roadColor = isExpressway ? 0x1a252f : 0x5d4037;
    const shoulderColor = isExpressway ? 0x34495e : 0x4e342e;
    const edgeColor = isExpressway ? 0xffffff : 0x8d6e63;
    const dashColor = isExpressway ? 0xf4d03f : 0xffeb3b;

    if (this.segments.length > 0) {
      if (isExpressway) {
        // Paved Shoulder Sub-base (Width: 28px)
        this.graphics.lineStyle(28, shoulderColor, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(this.segments[0].startX, this.segments[0].startY);
        for (const seg of this.segments) {
          this.graphics.lineTo(seg.endX, seg.endY);
        }
        this.graphics.strokePath();

        // Main Controlled-Access Asphalt Surface (Width: 20px)
        this.graphics.lineStyle(20, roadColor, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(this.segments[0].startX, this.segments[0].startY);
        for (const seg of this.segments) {
          this.graphics.lineTo(seg.endX, seg.endY);
        }
        this.graphics.strokePath();

        // Solid White Outer Highway Edge Line (Top Edge)
        this.graphics.lineStyle(3.5, edgeColor, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(this.segments[0].startX, this.segments[0].startY - 9);
        for (const seg of this.segments) {
          this.graphics.lineTo(seg.endX, seg.endY - 9);
        }
        this.graphics.strokePath();

        // Solid White Outer Highway Edge Line (Bottom Edge)
        this.graphics.lineStyle(2, 0xd5dbdb, 0.9);
        this.graphics.beginPath();
        this.graphics.moveTo(this.segments[0].startX, this.segments[0].startY + 9);
        for (const seg of this.segments) {
          this.graphics.lineTo(seg.endX, seg.endY + 9);
        }
        this.graphics.strokePath();

        // Center Yellow Dash Lane Markings along Segment Slope
        this.graphics.lineStyle(3.5, dashColor, 0.95);
        for (let i = 0; i < this.segments.length; i += 2) {
          const seg = this.segments[i];
          const midX = (seg.startX + seg.endX) / 2;
          const midY = (seg.startY + seg.endY) / 2;
          const angle = Math.atan2(seg.endY - seg.startY, seg.endX - seg.startX);
          const dx = Math.cos(angle) * 16;
          const dy = Math.sin(angle) * 16;

          this.graphics.beginPath();
          this.graphics.moveTo(midX - dx, midY - dy);
          this.graphics.lineTo(midX + dx, midY + dy);
          this.graphics.strokePath();
        }
      } else {
        // Standard dirt / rural road surface
        this.graphics.lineStyle(12, roadColor, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(this.segments[0].startX, this.segments[0].startY);
        for (const seg of this.segments) {
          this.graphics.lineTo(seg.endX, seg.endY);
        }
        this.graphics.strokePath();

        this.graphics.lineStyle(2, edgeColor, 0.9);
        this.graphics.beginPath();
        this.graphics.moveTo(this.segments[0].startX, this.segments[0].startY - 4);
        for (const seg of this.segments) {
          this.graphics.lineTo(seg.endX, seg.endY - 4);
        }
        this.graphics.strokePath();

        this.graphics.lineStyle(2, dashColor, 0.8);
        for (let i = 0; i < this.segments.length; i += 2) {
          const seg = this.segments[i];
          const midX = (seg.startX + seg.endX) / 2;
          const midY = (seg.startY + seg.endY) / 2;
          this.graphics.beginPath();
          this.graphics.moveTo(midX - 12, midY);
          this.graphics.lineTo(midX + 12, midY);
          this.graphics.strokePath();
        }

        // Draw grass patches on top of dirt road edges
        this.graphics.fillStyle(accentColor, 0.6);
        for (let i = 0; i < this.segments.length; i += 2) {
          const seg = this.segments[i];
          const grassX1 = seg.startX + Math.random() * 30;
          const grassY1 = seg.startY - 8 - Math.random() * 15;
          this.graphics.fillTriangle(grassX1, grassY1, grassX1 + 5, grassY1 - 12, grassX1 + 10, grassY1);
          const grassX2 = seg.startX + Math.random() * 30;
          const grassY2 = seg.startY + 8 + Math.random() * 15;
          this.graphics.fillTriangle(grassX2, grassY2, grassX2 + 5, grassY2 + 12, grassX2 + 10, grassY2);
        }
      }
    }
  }

  // Get all segments
  getSegments() {
    return this.segments;
  }

  // Get terrain length
  getLength() {
    return this.endX;
  }
}

export default Terrain;
