// ============================================
// Nepali Racer - Kathmandu-Nijgadh Fast Track Environment Renderer
// Visual Overhaul for Authentic 2D Expressway Experience
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

    // Dynamic Text Pool for Gantry Boards & Milestones (Depth 5)
    this.textPool = [];
    this.activeTexts = [];

    // Gameplay landmark section boundaries across 2500m total stage distance
    this.hillCutStart = 350;
    this.hillCutEnd = 850;

    this.bridgeStart = 900;
    this.bridgeEnd = 1150;

    this.tunnelStart = 1300;
    this.tunnelEnd = 1600;

    this.teraiStart = 2050;
    this.finishX = 2450;
  }

  // Update loop called from GameScene
  update(cameraX, cameraY) {
    if (!this.isFastTrack) return;
    this.recycleTexts();
    this.renderParallaxLayers(cameraX, cameraY);
    this.renderRoadInfrastructure(cameraX);
  }

  recycleTexts() {
    for (const t of this.activeTexts) {
      t.setVisible(false);
      this.textPool.push(t);
    }
    this.activeTexts = [];
  }

  getText(x, y, text, style) {
    let tObj = this.textPool.pop();
    if (!tObj) {
      tObj = this.scene.add.text(x, y, text, style).setDepth(5).setOrigin(0.5);
    } else {
      tObj.setPosition(x, y);
      tObj.setText(text);
      tObj.setStyle(style);
      tObj.setVisible(true);
    }
    this.activeTexts.push(tObj);
    return tObj;
  }

  // 1. Multi-Layer Parallax Background
  renderParallaxLayers(cameraX, cameraY) {
    this.skyGraphics.clear();
    this.farHimalayaGraphics.clear();
    this.midHillGraphics.clear();
    this.nearTreeGraphics.clear();

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    // A. Sky Gradient Transition (Khokana foothill blue -> Mahabharat -> Terai golden horizon)
    const t = Math.min(1, Math.max(0, cameraX / 2500));
    const skyTop = 0x5b9bd5;
    const skyBottom = t > 0.7 ? 0xfadbd8 : (t > 0.4 ? 0xd4efdf : 0xa9cce3);

    this.skyGraphics.fillStyle(skyTop, 1);
    this.skyGraphics.fillRect(0, 0, w, h * 0.6);
    this.skyGraphics.fillStyle(skyBottom, 1);
    this.skyGraphics.fillRect(0, h * 0.6, w, h * 0.4);
    this.skyGraphics.setScrollFactor(0);

    // B. Far Snow-Capped Himalayas (Parallax factor 0.04) - Organic Multi-Peak Ranges
    const himalayaOffset = (cameraX * 0.04) % 1200;
    this.farHimalayaGraphics.setScrollFactor(0, 0);

    for (let loop = -1; loop <= 1; loop++) {
      const baseX = loop * 1200 - himalayaOffset;
      
      // Main Himalayan Massif Base
      this.farHimalayaGraphics.fillStyle(0xd6eaf8, 0.55);
      this.farHimalayaGraphics.beginPath();
      this.farHimalayaGraphics.moveTo(baseX - 100, h * 0.65);
      this.farHimalayaGraphics.lineTo(baseX + 100, h * 0.35);
      this.farHimalayaGraphics.lineTo(baseX + 220, h * 0.45);
      this.farHimalayaGraphics.lineTo(baseX + 380, h * 0.22); // Peak 1
      this.farHimalayaGraphics.lineTo(baseX + 500, h * 0.40);
      this.farHimalayaGraphics.lineTo(baseX + 680, h * 0.18); // Peak 2 (Langtang / Ganesh massif style)
      this.farHimalayaGraphics.lineTo(baseX + 820, h * 0.38);
      this.farHimalayaGraphics.lineTo(baseX + 960, h * 0.25); // Peak 3
      this.farHimalayaGraphics.lineTo(baseX + 1120, h * 0.50);
      this.farHimalayaGraphics.lineTo(baseX + 1300, h * 0.65);
      this.farHimalayaGraphics.closePath();
      this.farHimalayaGraphics.fillPath();

      // Pure Snow Caps Overlayer
      this.farHimalayaGraphics.fillStyle(0xffffff, 0.95);
      // Peak 1 Snow
      this.farHimalayaGraphics.beginPath();
      this.farHimalayaGraphics.moveTo(baseX + 380, h * 0.22);
      this.farHimalayaGraphics.lineTo(baseX + 330, h * 0.31);
      this.farHimalayaGraphics.lineTo(baseX + 430, h * 0.32);
      this.farHimalayaGraphics.closePath();
      this.farHimalayaGraphics.fillPath();
      // Peak 2 Snow
      this.farHimalayaGraphics.beginPath();
      this.farHimalayaGraphics.moveTo(baseX + 680, h * 0.18);
      this.farHimalayaGraphics.lineTo(baseX + 610, h * 0.28);
      this.farHimalayaGraphics.lineTo(baseX + 740, h * 0.29);
      this.farHimalayaGraphics.closePath();
      this.farHimalayaGraphics.fillPath();
      // Peak 3 Snow
      this.farHimalayaGraphics.beginPath();
      this.farHimalayaGraphics.moveTo(baseX + 960, h * 0.25);
      this.farHimalayaGraphics.lineTo(baseX + 900, h * 0.34);
      this.farHimalayaGraphics.lineTo(baseX + 1010, h * 0.35);
      this.farHimalayaGraphics.closePath();
      this.farHimalayaGraphics.fillPath();
    }

    // C. Mahabharat Range / Mid Hills (Parallax factor 0.14) - Layered Green Ridges
    const midOffset = (cameraX * 0.14) % 900;
    const isTerai = cameraX > this.teraiStart;
    const hillColor = isTerai ? 0x27ae60 : 0x1e8449;
    const hillShadow = isTerai ? 0x1e8449 : 0x145a32;

    this.midHillGraphics.setScrollFactor(0, 0);
    for (let loop = -1; loop <= 1; loop++) {
      const baseX = loop * 900 - midOffset;

      // Layer 1 Back Hills
      this.midHillGraphics.fillStyle(hillShadow, 0.7);
      this.midHillGraphics.beginPath();
      this.midHillGraphics.moveTo(baseX - 50, h * 0.75);
      this.midHillGraphics.lineTo(baseX + 180, isTerai ? h * 0.58 : h * 0.42);
      this.midHillGraphics.lineTo(baseX + 420, isTerai ? h * 0.62 : h * 0.48);
      this.midHillGraphics.lineTo(baseX + 650, isTerai ? h * 0.56 : h * 0.38);
      this.midHillGraphics.lineTo(baseX + 950, h * 0.75);
      this.midHillGraphics.closePath();
      this.midHillGraphics.fillPath();

      // Layer 2 Front Hills
      this.midHillGraphics.fillStyle(hillColor, 0.85);
      this.midHillGraphics.beginPath();
      this.midHillGraphics.moveTo(baseX + 80, h * 0.75);
      this.midHillGraphics.lineTo(baseX + 320, isTerai ? h * 0.60 : h * 0.46);
      this.midHillGraphics.lineTo(baseX + 540, isTerai ? h * 0.64 : h * 0.52);
      this.midHillGraphics.lineTo(baseX + 800, isTerai ? h * 0.58 : h * 0.44);
      this.midHillGraphics.lineTo(baseX + 1000, h * 0.75);
      this.midHillGraphics.closePath();
      this.midHillGraphics.fillPath();
    }

    // D. Near Scenery / Vegetation (Parallax factor 0.38)
    const nearOffset = (cameraX * 0.38) % 500;
    this.nearTreeGraphics.setScrollFactor(0, 0);

    for (let x = -200; x < w + 300; x += 140) {
      const px = x - nearOffset;
      const py = h * 0.68;

      if (cameraX > this.teraiStart) {
        // Terai Subtropical Vegetation & Palm Silhouettes
        this.nearTreeGraphics.fillStyle(0x145a32, 0.6);
        this.nearTreeGraphics.fillRect(px - 2, py - 45, 5, 45);
        this.nearTreeGraphics.fillStyle(0x1e8449, 0.7);
        this.nearTreeGraphics.fillCircle(px, py - 48, 16);
        this.nearTreeGraphics.fillCircle(px - 10, py - 42, 12);
        this.nearTreeGraphics.fillCircle(px + 10, py - 42, 12);
        // Mustard Yellow Field Accents
        this.nearTreeGraphics.fillStyle(0xf4d03f, 0.35);
        this.nearTreeGraphics.fillEllipse(px, py + 12, 60, 10);
      } else if (cameraX >= this.bridgeStart && cameraX <= this.bridgeEnd) {
        // Deep River Valley Floor Below Bridge
        this.nearTreeGraphics.fillStyle(0x117864, 0.45);
        this.nearTreeGraphics.fillCircle(px, py + 30, 35);
      } else {
        // Foothill Pine & Sal Forest Vegetation
        this.nearTreeGraphics.fillStyle(0x0e6251, 0.65);
        this.nearTreeGraphics.fillTriangle(px - 14, py, px, py - 38, px + 14, py);
        this.nearTreeGraphics.fillTriangle(px - 10, py - 18, px, py - 52, px + 10, py - 18);
        this.nearTreeGraphics.fillStyle(0x5d4037, 0.8);
        this.nearTreeGraphics.fillRect(px - 2, py, 4, 12);
      }
    }
  }

  // 2. Road Infrastructure & Landmark Sections
  renderRoadInfrastructure(cameraX) {
    this.structGraphics.clear();
    this.fgGraphics.clear();

    const viewLeft = cameraX - 300;
    const viewRight = cameraX + this.scene.scale.width + 400;

    this.drawKathmanduStart(viewLeft, viewRight);
    this.drawHighwayGuardrailsAndPosts(viewLeft, viewRight);
    this.drawHillCutAndRetainingWalls(viewLeft, viewRight);
    this.drawConcreteViaductBridge(viewLeft, viewRight);
    this.drawHighwayTunnel(viewLeft, viewRight);
    this.drawNijgadhFinish(viewLeft, viewRight);
  }

  // A. KHOKANA / KATHMANDU STARTING SECTION (0m - 250m)
  drawKathmanduStart(viewLeft, viewRight) {
    const startX = 200;
    if (startX >= viewLeft && startX <= viewRight) {
      const gy = this.terrain.getTerrainYAt(startX);

      // Steel Overhead Highway Gantry Posts
      this.structGraphics.fillStyle(0x566573, 1);
      this.structGraphics.fillRect(startX - 90, gy - 110, 8, 110);
      this.structGraphics.fillRect(startX + 90, gy - 110, 8, 110);
      this.structGraphics.fillRect(startX - 94, gy - 110, 196, 10);

      // Green Signboard ("KHOKANA ➔ NIJGADH")
      this.structGraphics.fillStyle(0x1e8449, 1);
      this.structGraphics.fillRect(startX - 95, gy - 140, 190, 28);
      this.structGraphics.lineStyle(2, 0xffffff, 1);
      this.structGraphics.strokeRect(startX - 93, gy - 138, 186, 24);

      // Add crisp signboard text
      this.getText(startX, gy - 126, 'KHOKANA ➔ NIJGADH', {
        fontSize: '13px', fontStyle: 'bold', color: '#ffffff', fontFamily: 'monospace'
      });

      // Milestone Post at Start
      const msX = 100;
      if (msX >= viewLeft && msX <= viewRight) {
        const msY = this.terrain.getTerrainYAt(msX);
        this.structGraphics.fillStyle(0xf4f6f7, 1);
        this.structGraphics.fillRoundedRect(msX - 10, msY - 26, 20, 26, 4);
        this.structGraphics.fillStyle(0x27ae60, 1);
        this.structGraphics.fillRoundedRect(msX - 10, msY - 26, 20, 9, 4);
        this.getText(msX, msY - 12, 'START', {
          fontSize: '8px', fontStyle: 'bold', color: '#2c3e50', fontFamily: 'monospace'
        });
      }
    }
  }

  // B. CONTINUOUS HIGHWAY GUARDRAILS, REFLECTOR POSTS & GAME KM MARKERS
  drawHighwayGuardrailsAndPosts(viewLeft, viewRight) {
    const segments = this.terrain.getSegments();
    if (!segments) return;

    // Continuous W-Beam Steel Guardrail (Height: 11px above road)
    this.structGraphics.lineStyle(3, 0xd5dbdb, 0.95);
    for (let i = 0; i < segments.length; i += 2) {
      const seg = segments[i];
      if (seg.startX < viewLeft || seg.endX > viewRight) continue;

      // Skip inside tunnel interior
      if (seg.startX >= this.tunnelStart && seg.endX <= this.tunnelEnd) continue;

      const y1 = seg.startY - 11;
      const y2 = seg.endY - 11;

      // Guardrail Beam
      this.structGraphics.beginPath();
      this.structGraphics.moveTo(seg.startX, y1);
      this.structGraphics.lineTo(seg.endX, y2);
      this.structGraphics.strokePath();

      // Vertical Support Steel Post
      this.structGraphics.lineStyle(1.8, 0x7f8c8d, 1);
      this.structGraphics.beginPath();
      this.structGraphics.moveTo(seg.startX, y1);
      this.structGraphics.lineTo(seg.startX, seg.startY);
      this.structGraphics.strokePath();
      this.structGraphics.lineStyle(3, 0xd5dbdb, 0.95);

      // Reflector / Delineator Post (Every 80m)
      if (Math.floor(seg.startX / 80) % 2 === 0) {
        this.structGraphics.fillStyle(0xffffff, 1);
        this.structGraphics.fillRect(seg.startX - 1.5, y1 - 9, 3, 9);
        this.structGraphics.fillStyle(0xf4d03f, 1);
        this.structGraphics.fillRect(seg.startX - 1.5, y1 - 9, 3, 3);
      }
    }

    // In-game Progression Distance Milestones every 500m ("KM 0.5", "KM 1.0", "KM 1.5", "KM 2.0")
    for (let kmVal = 0.5; kmVal <= 2.0; kmVal += 0.5) {
      const mX = kmVal * 1000;
      if (mX >= viewLeft && mX <= viewRight) {
        const mY = this.terrain.getTerrainYAt(mX);
        this.structGraphics.fillStyle(0xf4f6f7, 1);
        this.structGraphics.fillRoundedRect(mX - 12, mY - 26, 24, 26, 4);
        this.structGraphics.fillStyle(0x1e8449, 1);
        this.structGraphics.fillRoundedRect(mX - 12, mY - 26, 24, 9, 4);
        this.getText(mX, mY - 10, `KM ${kmVal.toFixed(1)}`, {
          fontSize: '8px', fontStyle: 'bold', color: '#2c3e50', fontFamily: 'monospace'
        });
      }
    }
  }

  // C. ROAD-CUT HILL SECTION & CONCRETE/GABION RETAINING WALLS (350m - 850m)
  drawHillCutAndRetainingWalls(viewLeft, viewRight) {
    if (this.hillCutEnd < viewLeft || this.hillCutStart > viewRight) return;

    const segments = this.terrain.getSegments();
    if (!segments) return;

    for (const seg of segments) {
      if (seg.startX >= this.hillCutStart && seg.endX <= this.hillCutEnd) {
        if (seg.startX < viewLeft || seg.endX > viewRight) continue;

        const y1 = seg.startY;
        const y2 = seg.endY;

        // 1. Concrete Gabion Retaining Wall Base (36px wall behind road edge)
        this.structGraphics.fillStyle(0x95a5a6, 0.95);
        this.structGraphics.beginPath();
        this.structGraphics.moveTo(seg.startX, y1 - 10);
        this.structGraphics.lineTo(seg.endX, y2 - 10);
        this.structGraphics.lineTo(seg.endX, y2 - 44);
        this.structGraphics.lineTo(seg.startX, y1 - 44);
        this.structGraphics.closePath();
        this.structGraphics.fillPath();

        // Concrete Wall Grid / Mortar Joints
        this.structGraphics.lineStyle(1, 0x7f8c8d, 0.7);
        this.structGraphics.beginPath();
        this.structGraphics.moveTo(seg.startX, y1 - 27);
        this.structGraphics.lineTo(seg.endX, y2 - 27);
        this.structGraphics.strokePath();

        // 2. Exposed Hill Cut Slope above retaining wall
        this.nearTreeGraphics.fillStyle(0x6e5b4b, 0.65);
        this.nearTreeGraphics.beginPath();
        this.nearTreeGraphics.moveTo(seg.startX, y1 - 44);
        this.nearTreeGraphics.lineTo(seg.endX, y2 - 44);
        this.nearTreeGraphics.lineTo(seg.endX, y2 - 110);
        this.nearTreeGraphics.lineTo(seg.startX, y1 - 110);
        this.nearTreeGraphics.closePath();
        this.nearTreeGraphics.fillPath();
      }
    }

    // Hill Cut Roadside Warning Sign
    const signX = 450;
    if (signX >= viewLeft && signX <= viewRight) {
      const sy = this.terrain.getTerrainYAt(signX);
      this.structGraphics.fillStyle(0x7f8c8d, 1);
      this.structGraphics.fillRect(signX - 2, sy - 45, 4, 45);
      // Yellow Diamond Warning Board
      this.structGraphics.fillStyle(0xf4d03f, 1);
      this.structGraphics.beginPath();
      this.structGraphics.moveTo(signX, sy - 68);
      this.structGraphics.lineTo(signX + 18, sy - 45);
      this.structGraphics.lineTo(signX, sy - 22);
      this.structGraphics.lineTo(signX - 18, sy - 45);
      this.structGraphics.closePath();
      this.structGraphics.fillPath();
      this.getText(signX, sy - 45, 'CUT', {
        fontSize: '9px', fontStyle: 'bold', color: '#1a252f', fontFamily: 'monospace'
      });
    }
  }

  // D. CONCRETE BOX GIRDER MEGA-VIADUCT BRIDGE (900m - 1150m)
  drawConcreteViaductBridge(viewLeft, viewRight) {
    if (this.bridgeEnd < viewLeft || this.bridgeStart > viewRight) return;

    const segments = this.terrain.getSegments();
    if (!segments) return;

    // 1. Concrete Box-Girder Deck Slab beneath road surface (No collision, pure visual)
    this.structGraphics.fillStyle(0x2c3e50, 1);
    for (const seg of segments) {
      if (seg.startX >= this.bridgeStart && seg.endX <= this.bridgeEnd) {
        if (seg.startX < viewLeft || seg.endX > viewRight) continue;

        const y1 = seg.startY;
        const y2 = seg.endY;

        this.structGraphics.beginPath();
        this.structGraphics.moveTo(seg.startX, y1);
        this.structGraphics.lineTo(seg.endX, y2);
        this.structGraphics.lineTo(seg.endX, y2 + 22);
        this.structGraphics.lineTo(seg.startX, y1 + 22);
        this.structGraphics.closePath();
        this.structGraphics.fillPath();

        // Parapet Concrete Barrier Wall
        this.structGraphics.fillStyle(0xbdc3c7, 0.9);
        this.structGraphics.fillRect(seg.startX, y1 - 16, seg.endX - seg.startX, 6);
        this.structGraphics.fillStyle(0x2c3e50, 1);
      }
    }

    // 2. Massive Concrete Bridge Piers / Columns down into Deep River Valley
    const pierPositions = [950, 1050, 1120];
    pierPositions.forEach(px => {
      if (px >= viewLeft && px <= viewRight) {
        const py = this.terrain.getTerrainYAt(px);
        // Concrete Pier Cap
        this.structGraphics.fillStyle(0x95a5a6, 1);
        this.structGraphics.fillRect(px - 18, py + 22, 36, 14);
        // Vertical Pier Tower
        this.structGraphics.fillStyle(0x7f8c8d, 1);
        this.structGraphics.fillRect(px - 12, py + 36, 24, 180);

        // Deep Valley River Stream below
        this.nearTreeGraphics.fillStyle(0x2980b9, 0.8);
        this.nearTreeGraphics.fillRect(px - 60, py + 180, 120, 20);
        this.nearTreeGraphics.fillStyle(0x7fb3d5, 0.5);
        this.nearTreeGraphics.fillRect(px - 40, py + 184, 80, 6);
      }
    });
  }

  // E. MODERN HIGHWAY TWIN-TUBE TUNNEL (1300m - 1600m)
  drawHighwayTunnel(viewLeft, viewRight) {
    if (this.tunnelEnd < viewLeft || this.tunnelStart > viewRight) return;

    // 1. Entrance Horseshoe Concrete Portal Arch (1300m)
    if (this.tunnelStart >= viewLeft && this.tunnelStart <= viewRight) {
      const ey = this.terrain.getTerrainYAt(this.tunnelStart);
      // Outer Reinforced Concrete Frame
      this.structGraphics.fillStyle(0x95a5a6, 1);
      this.structGraphics.fillRect(this.tunnelStart - 25, ey - 120, 50, 120);
      // Dark Horseshoe Mouth
      this.structGraphics.fillStyle(0x1a252f, 1);
      this.structGraphics.fillCircle(this.tunnelStart, ey - 55, 48);

      // Tunnel Nameplate Header ("FAST TRACK TUNNEL")
      this.structGraphics.fillStyle(0x2c3e50, 1);
      this.structGraphics.fillRect(this.tunnelStart - 65, ey - 110, 130, 18);
      this.structGraphics.fillStyle(0xf4d03f, 1);
      this.structGraphics.fillRect(this.tunnelStart - 62, ey - 108, 124, 2);
      this.getText(this.tunnelStart, ey - 99, 'FAST TRACK TUNNEL', {
        fontSize: '10px', fontStyle: 'bold', color: '#f4d03f', fontFamily: 'monospace'
      });
    }

    // 2. Tunnel Interior Semi-Translucent Dark Roof & Ceiling LED Lighting (Depth 12, pure visual)
    const segments = this.terrain.getSegments();
    if (segments) {
      this.fgGraphics.fillStyle(0x15202b, 0.78); // Semi-dark ceiling overlay
      for (const seg of segments) {
        if (seg.startX >= this.tunnelStart && seg.endX <= this.tunnelEnd) {
          if (seg.startX < viewLeft || seg.endX > viewRight) continue;

          this.fgGraphics.beginPath();
          this.fgGraphics.moveTo(seg.startX, seg.startY - 110);
          this.fgGraphics.lineTo(seg.endX, seg.endY - 110);
          this.fgGraphics.lineTo(seg.endX, seg.endY - 20);
          this.fgGraphics.lineTo(seg.startX, seg.startY - 20);
          this.fgGraphics.closePath();
          this.fgGraphics.fillPath();

          // Continuous Ceiling Sodium/LED Light Fixtures every 40m
          if (Math.floor(seg.startX / 40) % 2 === 0) {
            this.fgGraphics.fillStyle(0xf4d03f, 1);
            this.fgGraphics.fillCircle(seg.startX, seg.startY - 105, 4);
            this.fgGraphics.fillStyle(0xfef9e7, 0.35);
            this.fgGraphics.fillCircle(seg.startX, seg.startY - 105, 14);
            this.fgGraphics.fillStyle(0x15202b, 0.78);
          }
        }
      }
    }

    // 3. Exit Horseshoe Concrete Portal Arch (1600m)
    if (this.tunnelEnd >= viewLeft && this.tunnelEnd <= viewRight) {
      const exY = this.terrain.getTerrainYAt(this.tunnelEnd);
      this.structGraphics.fillStyle(0x95a5a6, 1);
      this.structGraphics.fillRect(this.tunnelEnd - 25, exY - 120, 50, 120);
      // Bright Daylight Exit Opening
      this.structGraphics.fillStyle(0xeaecee, 0.95);
      this.structGraphics.fillCircle(this.tunnelEnd, exY - 55, 48);
    }
  }

  // F. NIJGADH / TERAI FINISH SECTION (2350m - 2500m)
  drawNijgadhFinish(viewLeft, viewRight) {
    if (this.finishX >= viewLeft && this.finishX <= viewRight) {
      const gy = this.terrain.getTerrainYAt(this.finishX);

      // Finish Overhead Highway Gantry Structure
      this.structGraphics.fillStyle(0x566573, 1);
      this.structGraphics.fillRect(this.finishX - 90, gy - 110, 8, 110);
      this.structGraphics.fillRect(this.finishX + 90, gy - 110, 8, 110);
      this.structGraphics.fillRect(this.finishX - 94, gy - 110, 196, 10);

      // Destination Signboard ("NIJGADH / BARA ➔ END")
      this.structGraphics.fillStyle(0x1e8449, 1);
      this.structGraphics.fillRect(this.finishX - 95, gy - 140, 190, 28);
      this.structGraphics.lineStyle(2, 0xffffff, 1);
      this.structGraphics.strokeRect(this.finishX - 93, gy - 138, 186, 24);

      this.getText(this.finishX, gy - 126, 'NIJGADH / BARA ➔ END', {
        fontSize: '13px', fontStyle: 'bold', color: '#ffffff', fontFamily: 'monospace'
      });

      // Milestone Post at Finish
      const msX = this.finishX - 35;
      this.structGraphics.fillStyle(0xf4f6f7, 1);
      this.structGraphics.fillRoundedRect(msX - 10, gy - 24, 20, 24, 4);
      this.structGraphics.fillStyle(0x27ae60, 1);
      this.structGraphics.fillRoundedRect(msX - 10, gy - 24, 20, 9, 4);
      this.getText(msX, gy - 10, 'FINISH', {
        fontSize: '8px', fontStyle: 'bold', color: '#2c3e50', fontFamily: 'monospace'
      });
    }
  }

  destroy() {
    this.skyGraphics.destroy();
    this.farHimalayaGraphics.destroy();
    this.midHillGraphics.destroy();
    this.nearTreeGraphics.destroy();
    this.structGraphics.destroy();
    this.fgGraphics.destroy();
    for (const t of this.textPool) t.destroy();
    for (const t of this.activeTexts) t.destroy();
    this.textPool = [];
    this.activeTexts = [];
  }
}

export default EnvironmentRenderer;
