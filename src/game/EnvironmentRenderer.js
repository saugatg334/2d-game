// ============================================
// Nepali Racer - Kathmandu-Nijgadh Fast Track Environment Renderer
// ============================================

export class EnvironmentRenderer {
  constructor(scene, terrain, stage) {
    this.scene = scene;
    this.terrain = terrain;
    this.stage = stage;
    this.isFastTrack = stage.id === 'ktm_nijgadh_fast_track' || stage.environment === 'fast_track';

    // Layered Graphics for smooth depth & parallax rendering
    this.skyGraphics = scene.add.graphics().setDepth(-40);
    this.farHimalayaGraphics = scene.add.graphics().setDepth(-30);
    this.midHillGraphics = scene.add.graphics().setDepth(-20);
    this.nearTreeGraphics = scene.add.graphics().setDepth(-10);
    this.structGraphics = scene.add.graphics().setDepth(2);
    this.fgGraphics = scene.add.graphics().setDepth(12);

    // Section markers for Kathmandu-Nijgadh Fast Track (3600m)
    this.tunnelStart = 2050;
    this.tunnelEnd = 2500;
    this.bridgeStart = 1650;
    this.bridgeEnd = 2050;
  }

  // Update loop called from GameScene
  update(cameraX, cameraY) {
    if (!this.isFastTrack) return;
    this.renderParallaxLayers(cameraX, cameraY);
    this.renderRoadInfrastructure(cameraX);
  }

  // 1. Multi-Layer Parallax Background
  renderParallaxLayers(cameraX, cameraY) {
    this.skyGraphics.clear();
    this.farHimalayaGraphics.clear();
    this.midHillGraphics.clear();
    this.nearTreeGraphics.clear();

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    // A. Sky Gradient
    this.skyGraphics.fillStyle(0x85c1e9, 1);
    this.skyGraphics.fillRect(0, 0, w, h);
    this.skyGraphics.setScrollFactor(0);

    // B. Far Snow-Capped Himalayas (Parallax factor 0.05)
    const himalayaOffset = (cameraX * 0.05) % 500;
    this.farHimalayaGraphics.fillStyle(0xebf5fb, 0.45);
    for (let x = -500; x < w + 500; x += 350) {
      const px = x - himalayaOffset;
      const py = h * 0.4;
      this.farHimalayaGraphics.fillTriangle(px - 180, py + 120, px, py - 110, px + 180, py + 120);
      // Snow Cap Top
      this.farHimalayaGraphics.fillStyle(0xffffff, 0.85);
      this.farHimalayaGraphics.fillTriangle(px - 45, py - 25, px, py - 110, px + 45, py - 25);
      this.farHimalayaGraphics.fillStyle(0xebf5fb, 0.45);
    }
    this.farHimalayaGraphics.setScrollFactor(0, 0);

    // C. Mahabharat Range / Mid Hills (Parallax factor 0.18)
    const midHillOffset = (cameraX * 0.18) % 400;
    const isTerai = cameraX > 3000;
    const hillColor = isTerai ? 0x27ae60 : 0x1e8449;

    this.midHillGraphics.fillStyle(hillColor, 0.65);
    for (let x = -400; x < w + 400; x += 280) {
      const px = x - midHillOffset;
      const py = h * 0.52;
      const hillH = isTerai ? 45 : 95;
      this.midHillGraphics.fillTriangle(px - 160, py + 160, px, py - hillH, px + 160, py + 160);
    }
    this.midHillGraphics.setScrollFactor(0, 0);

    // D. Near Trees / Sal Forest (Parallax factor 0.4 - aligned to near horizon)
    const nearOffset = (cameraX * 0.4) % 300;
    this.nearTreeGraphics.fillStyle(0x145a32, 0.5);
    for (let x = -300; x < w + 300; x += 180) {
      const px = x - nearOffset;
      const py = h * 0.65;
      if (cameraX > 2500 && cameraX < 3000) {
        // Dense Sal Forest
        this.nearTreeGraphics.fillRect(px - 3, py - 40, 6, 40);
        this.nearTreeGraphics.fillCircle(px, py - 50, 22);
      } else if (cameraX >= 3000) {
        // Terai Mustard / Palm Groves
        this.nearTreeGraphics.fillStyle(0xf1c40f, 0.5);
        this.nearTreeGraphics.fillEllipse(px, py + 10, 50, 14);
        this.nearTreeGraphics.fillStyle(0x145a32, 0.5);
      }
    }
    this.nearTreeGraphics.setScrollFactor(0, 0);
  }

  // 2. Road Infrastructure & Section Structures (Aligned to Physics Terrain Coordinates)
  renderRoadInfrastructure(cameraX) {
    this.structGraphics.clear();
    this.fgGraphics.clear();

    const viewLeft = cameraX - 250;
    const viewRight = cameraX + this.scene.scale.width + 350;

    this.drawKathmanduStart(viewLeft, viewRight);
    this.drawHighwayGuardrailsAndPosts(viewLeft, viewRight);
    this.drawRoadCutAndRetainingWalls(viewLeft, viewRight);
    this.drawConcreteViaductBridge(viewLeft, viewRight);
    this.drawHighwayTunnel(viewLeft, viewRight);
    this.drawNijgadhFinish(viewLeft, viewRight);
  }

  // 1. KATHMANDU / STARTING SECTION (0m - 350m)
  drawKathmanduStart(viewLeft, viewRight) {
    const startX = 250;
    if (startX >= viewLeft && startX <= viewRight) {
      const gy = this.terrain.getTerrainYAt(startX);

      // Realistic Overhead Highway Gantry Board
      this.structGraphics.fillStyle(0x7f8c8d, 1);
      this.structGraphics.fillRect(startX - 70, gy - 95, 6, 95);
      this.structGraphics.fillRect(startX + 70, gy - 95, 6, 95);

      // Green Nepali Highway Signboard Board
      this.structGraphics.fillStyle(0x1e8449, 1);
      this.structGraphics.fillRect(startX - 80, gy - 115, 160, 26);
      this.structGraphics.lineStyle(1.5, 0xffffff, 1);
      this.structGraphics.strokeRect(startX - 78, gy - 113, 156, 22);

      // Nepali Direction Badge
      this.structGraphics.fillStyle(0xc0392b, 1);
      this.structGraphics.fillRect(startX - 72, gy - 110, 16, 16);

      // Milestone Post at Start (KTM 0 KM)
      const msX = 120;
      if (msX >= viewLeft && msX <= viewRight) {
        const msY = this.terrain.getTerrainYAt(msX);
        this.structGraphics.fillStyle(0xf4f6f7, 1);
        this.structGraphics.fillRoundedRect(msX - 6, msY - 20, 12, 20, 3);
        this.structGraphics.fillStyle(0x27ae60, 1);
        this.structGraphics.fillRoundedRect(msX - 6, msY - 20, 12, 7, 3);
      }
    }
  }

  // 2. CONTINUOUS HIGHWAY GUARDRAILS & REFLECTOR POSTS
  drawHighwayGuardrailsAndPosts(viewLeft, viewRight) {
    const segments = this.terrain.getSegments();
    if (!segments) return;

    // Metallic W-Beam Guardrail line (height: 14px above road surface)
    this.structGraphics.lineStyle(2.5, 0xd5dbdb, 0.95);
    for (let i = 0; i < segments.length; i += 2) {
      const seg = segments[i];
      if (seg.startX < viewLeft || seg.endX > viewRight) continue;

      // Skip inside tunnel interior
      if (seg.startX >= this.tunnelStart && seg.endX <= this.tunnelEnd) continue;

      const y1 = seg.startY - 12;
      const y2 = seg.endY - 12;

      // Guardrail rail
      this.structGraphics.beginPath();
      this.structGraphics.moveTo(seg.startX, y1);
      this.structGraphics.lineTo(seg.endX, y2);
      this.structGraphics.strokePath();

      // Steel Support Post
      this.structGraphics.lineStyle(1.5, 0x7f8c8d, 1);
      this.structGraphics.beginPath();
      this.structGraphics.moveTo(seg.startX, y1);
      this.structGraphics.lineTo(seg.startX, seg.startY);
      this.structGraphics.strokePath();
      this.structGraphics.lineStyle(2.5, 0xd5dbdb, 0.95);

      // Delineator / Reflector Post (Every 60m)
      if (Math.floor(seg.startX / 60) % 2 === 0) {
        this.structGraphics.fillStyle(0xffffff, 1);
        this.structGraphics.fillRect(seg.startX - 1, y1 - 8, 3, 8);
        this.structGraphics.fillStyle(0xf1c40f, 1);
        this.structGraphics.fillRect(seg.startX - 1, y1 - 8, 3, 2.5);
      }
    }

    // Milestone Posts every 500m
    for (let m = 500; m <= 3500; m += 500) {
      if (m >= viewLeft && m <= viewRight) {
        const my = this.terrain.getTerrainYAt(m);
        this.structGraphics.fillStyle(0xf4f6f7, 1);
        this.structGraphics.fillRoundedRect(m - 6, my - 22, 12, 22, 3);
        this.structGraphics.fillStyle(0x27ae60, 1);
        this.structGraphics.fillRoundedRect(m - 6, my - 22, 12, 7, 3);
      }
    }
  }

  // 3. ROAD-CUT HILL SECTION & RETAINING WALLS (750m - 1250m)
  drawRoadCutAndRetainingWalls(viewLeft, viewRight) {
    const cutStart = 750;
    const cutEnd = 1250;
    if (cutEnd < viewLeft || cutStart > viewRight) return;

    const segments = this.terrain.getSegments();
    if (!segments) return;

    for (const seg of segments) {
      if (seg.startX >= cutStart && seg.endX <= cutEnd) {
        if (seg.startX < viewLeft || seg.endX > viewRight) continue;

        const y1 = seg.startY;
        const y2 = seg.endY;

        // Concrete Gabion Retaining Wall Base (height: 35px behind road)
        this.structGraphics.fillStyle(0x95a5a6, 0.95);
        this.structGraphics.beginPath();
        this.structGraphics.moveTo(seg.startX, y1);
        this.structGraphics.lineTo(seg.endX, y2);
        this.structGraphics.lineTo(seg.endX, y2 - 32);
        this.structGraphics.lineTo(seg.startX, y1 - 32);
        this.structGraphics.closePath();
        this.structGraphics.fillPath();

        // Gabion Grid Line Texture
        this.structGraphics.lineStyle(1, 0x7f8c8d, 0.6);
        this.structGraphics.beginPath();
        this.structGraphics.moveTo(seg.startX, y1 - 16);
        this.structGraphics.lineTo(seg.endX, y2 - 16);
        this.structGraphics.strokePath();

        // Exposed Rocky Soil Slope above retaining wall
        this.nearTreeGraphics.fillStyle(0x6e5b4b, 0.6);
        this.nearTreeGraphics.beginPath();
        this.nearTreeGraphics.moveTo(seg.startX, y1 - 32);
        this.nearTreeGraphics.lineTo(seg.endX, y2 - 32);
        this.nearTreeGraphics.lineTo(seg.endX, y2 - 75);
        this.nearTreeGraphics.lineTo(seg.startX, y1 - 75);
        this.nearTreeGraphics.closePath();
        this.nearTreeGraphics.fillPath();
      }
    }
  }

  // 4. CONCRETE BOX GIRDER VIADUCT BRIDGE (1650m - 2050m)
  drawConcreteViaductBridge(viewLeft, viewRight) {
    if (this.bridgeEnd < viewLeft || this.bridgeStart > viewRight) return;

    const segments = this.terrain.getSegments();
    if (!segments) return;

    // Concrete Box Girder Deck Slab beneath road surface
    this.structGraphics.fillStyle(0x34495e, 1);
    for (const seg of segments) {
      if (seg.startX >= this.bridgeStart && seg.endX <= this.bridgeEnd) {
        if (seg.startX < viewLeft || seg.endX > viewRight) continue;

        const y1 = seg.startY;
        const y2 = seg.endY;

        // Bridge Deck Girder
        this.structGraphics.beginPath();
        this.structGraphics.moveTo(seg.startX, y1);
        this.structGraphics.lineTo(seg.endX, y2);
        this.structGraphics.lineTo(seg.endX, y2 + 16);
        this.structGraphics.lineTo(seg.startX, y1 + 16);
        this.structGraphics.closePath();
        this.structGraphics.fillPath();
      }
    }

    // Concrete Bridge Piers / Columns into Deep Valley
    const pierPositions = [1720, 1820, 1920, 2020];
    pierPositions.forEach(px => {
      if (px >= viewLeft && px <= viewRight) {
        const py = this.terrain.getTerrainYAt(px);
        // Concrete Pier Tower
        this.structGraphics.fillStyle(0x7f8c8d, 1);
        this.structGraphics.fillRect(px - 10, py + 16, 20, 160);
        this.structGraphics.fillStyle(0x95a5a6, 1);
        this.structGraphics.fillRect(px - 14, py + 16, 28, 14);

        // River Water Stream at bottom of valley
        this.nearTreeGraphics.fillStyle(0x2980b9, 0.7);
        this.nearTreeGraphics.fillRect(px - 40, py + 150, 80, 15);
      }
    });
  }

  // 5. MODERN HIGHWAY TWIN-TUBE TUNNEL (2050m - 2500m)
  drawHighwayTunnel(viewLeft, viewRight) {
    if (this.tunnelEnd < viewLeft || this.tunnelStart > viewRight) return;

    // Entrance Horseshoe Portal Arch (2050m)
    if (this.tunnelStart >= viewLeft && this.tunnelStart <= viewRight) {
      const ey = this.terrain.getTerrainYAt(this.tunnelStart);
      // Concrete Portal Outer Wall
      this.structGraphics.fillStyle(0xbdc3c7, 1);
      this.structGraphics.fillRect(this.tunnelStart - 20, ey - 105, 40, 105);
      // Arch Tunnel Mouth
      this.structGraphics.fillStyle(0x1c2833, 1);
      this.structGraphics.fillCircle(this.tunnelStart, ey - 50, 42);

      // Header Plate ("FAST TRACK TUNNEL #1")
      this.structGraphics.fillStyle(0x2c3e50, 1);
      this.structGraphics.fillRect(this.tunnelStart - 45, ey - 95, 90, 14);
      this.structGraphics.fillStyle(0xf1c40f, 1);
      this.structGraphics.fillRect(this.tunnelStart - 42, ey - 93, 84, 2);
    }

    // Tunnel Interior Ceiling & Overhead Lighting (Forefront overlay depth 12)
    const segments = this.terrain.getSegments();
    if (segments) {
      this.fgGraphics.fillStyle(0x1c2833, 0.72); // Semi-translucent dark roof overlay
      for (const seg of segments) {
        if (seg.startX >= this.tunnelStart && seg.endX <= this.tunnelEnd) {
          if (seg.startX < viewLeft || seg.endX > viewRight) continue;

          this.fgGraphics.beginPath();
          this.fgGraphics.moveTo(seg.startX, seg.startY - 95);
          this.fgGraphics.lineTo(seg.endX, seg.endY - 95);
          this.fgGraphics.lineTo(seg.endX, seg.endY - 18);
          this.fgGraphics.lineTo(seg.startX, seg.startY - 18);
          this.fgGraphics.closePath();
          this.fgGraphics.fillPath();

          // Continuous Overhead Sodium LED Light Strip
          if (Math.floor(seg.startX / 40) % 2 === 0) {
            this.fgGraphics.fillStyle(0xf1c40f, 1);
            this.fgGraphics.fillCircle(seg.startX, seg.startY - 90, 3.5);
            this.fgGraphics.fillStyle(0xfff9c4, 0.35);
            this.fgGraphics.fillCircle(seg.startX, seg.startY - 90, 12);
            this.fgGraphics.fillStyle(0x1c2833, 0.72);
          }
        }
      }
    }

    // Exit Horseshoe Portal Arch (2500m)
    if (this.tunnelEnd >= viewLeft && this.tunnelEnd <= viewRight) {
      const exY = this.terrain.getTerrainYAt(this.tunnelEnd);
      this.structGraphics.fillStyle(0xbdc3c7, 1);
      this.structGraphics.fillRect(this.tunnelEnd - 20, exY - 105, 40, 105);
      this.structGraphics.fillStyle(0xebf5fb, 0.95);
      this.structGraphics.fillCircle(this.tunnelEnd, exY - 50, 42);
    }
  }

  // 6. NIJGADH / TERAI FINISH SECTION (3450m - 3800m)
  drawNijgadhFinish(viewLeft, viewRight) {
    const finishX = 3600;
    if (finishX >= viewLeft && finishX <= viewRight) {
      const gy = this.terrain.getTerrainYAt(finishX);

      // Finish Overhead Highway Gantry
      this.structGraphics.fillStyle(0x7f8c8d, 1);
      this.structGraphics.fillRect(finishX - 70, gy - 95, 6, 95);
      this.structGraphics.fillRect(finishX + 70, gy - 95, 6, 95);

      // Destination Board ("NIJGADH, BARA - END OF FAST TRACK")
      this.structGraphics.fillStyle(0x1e8449, 1);
      this.structGraphics.fillRect(finishX - 85, gy - 115, 170, 26);
      this.structGraphics.lineStyle(1.5, 0xffffff, 1);
      this.structGraphics.strokeRect(finishX - 83, gy - 113, 166, 22);

      // Milestone Post at Finish (NIJGADH 76 KM)
      const msX = finishX - 30;
      this.structGraphics.fillStyle(0xf4f6f7, 1);
      this.structGraphics.fillRoundedRect(msX - 6, gy - 20, 12, 20, 3);
      this.structGraphics.fillStyle(0x27ae60, 1);
      this.structGraphics.fillRoundedRect(msX - 6, gy - 20, 12, 7, 3);
    }
  }

  destroy() {
    this.skyGraphics.destroy();
    this.farHimalayaGraphics.destroy();
    this.midHillGraphics.destroy();
    this.nearTreeGraphics.destroy();
    this.structGraphics.destroy();
    this.fgGraphics.destroy();
  }
}

export default EnvironmentRenderer;
