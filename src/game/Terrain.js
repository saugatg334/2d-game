// ============================================
// Nepali Racer - Procedural Terrain
// ============================================

import { resolveStagePlan } from './StagePlan.js';

// ---- P3 Step 2: profile definitions for legacy terrain ----
// Feature-mix weights and rhythm per existing terrain.profile value (only the
// profile names already present in stages.js are defined here). Weights are
// the base probabilities BEFORE the stage's jumpChance / valleyChance factors
// are applied (those factors scale the ramp/valley weights); `amplitude`
// scales how much of the stage's minHeight..maxHeight elevation band each
// feature uses; runMin/runMax bound how many segments one hill feature spans
// (sustained climbs vs choppy terrain).
const LEGACY_TERRAIN_PROFILES = {
  flat:          { flatWeight: 0.55, hillWeight: 0.25, rampWeight: 0.10, valleyWeight: 0.10, amplitude: 0.30, runMin: 1, runMax: 2 },
  rolling_hills: { flatWeight: 0.30, hillWeight: 0.45, rampWeight: 0.12, valleyWeight: 0.13, amplitude: 0.65, runMin: 2, runMax: 4 },
  steep_hills:   { flatWeight: 0.18, hillWeight: 0.52, rampWeight: 0.15, valleyWeight: 0.15, amplitude: 1.00, runMin: 2, runMax: 5 },
  valley:        { flatWeight: 0.22, hillWeight: 0.38, rampWeight: 0.10, valleyWeight: 0.30, amplitude: 0.85, runMin: 2, runMax: 5 },
  mountain_road: { flatWeight: 0.15, hillWeight: 0.55, rampWeight: 0.12, valleyWeight: 0.18, amplitude: 0.95, runMin: 3, runMax: 6 },
  rocky:         { flatWeight: 0.20, hillWeight: 0.40, rampWeight: 0.22, valleyWeight: 0.18, amplitude: 0.90, runMin: 1, runMax: 3 },
  expressway:    { flatWeight: 0.60, hillWeight: 0.28, rampWeight: 0.04, valleyWeight: 0.08, amplitude: 0.35, runMin: 2, runMax: 4 }
};

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

    // ---- P0 Step 2: data-driven Fast Track section plan ----
    // The stage plan is resolved ONCE here (pure, no side effects) and stored
    // for the lifetime of this Terrain instance. It is never re-resolved in
    // update()/getTerrainYAt()/getTerrainAngleAt()/per-segment loops.
    //
    // STAGE-SPACE vs WORLD-X: StagePlan sections are normalized in absolute
    // stage-space starting at X=0. Terrain's world coordinates already coincide
    // with stage-space: the flat 0->400 starting platform is added directly in
    // generate() (see below) and NEVER routed through section selection, and
    // the section formulas consume absolute segment endX values (which equal
    // stage-space X). No +/-400 conversion exists or is needed; do not add one.
    this.stagePlan = resolveStagePlan(scene.stage || null);

    // Fast Track detection via resolved profile/environment only (no hardcoded
    // stage IDs, so additional Fast Track stages keep working). Note: current
    // stage data stores terrain.profile='expressway' for Fast Track stages, so
    // the environment is also accepted until the data migrates to
    // profile:'fast_track'.
    const planProfile = this.stagePlan.terrain.profile;
    const planEnvironment = this.stagePlan.environment;
    this.isFastTrack = planProfile === 'fast_track' || planEnvironment === 'fast_track';

    // Single source of truth for Fast Track section boundaries. Empty for
    // legacy/procedural stages AND for Fast Track stages whose data does not
    // (yet) define sections - those keep using the legacy fallback below.
    this.fastTrackSections = this.stagePlan.terrain.sections;

    // ---- P3 Step 2: data-driven legacy terrain configuration ----
    // Non-Fast-Track stages now generate from their own resolved stage data
    // (terrain.profile / minHeight / maxHeight / jumpChance / valleyChance /
    // segmentWidth). Fast Track stages are untouched: the sections-based paths
    // handle them exclusively and this config is never consulted for them.
    // Every value resolves with a safe fallback so stages with missing or
    // invalid data keep generating playable terrain.
    this.legacyTerrain = this.resolveLegacyTerrainConfig();
    this.legacyRun = { remaining: 0, afterRemaining: 0, stepY: 0, afterStepY: 0 };
    if (!this.isFastTrack) {
      this.segmentWidth = this.legacyTerrain.segmentWidth;
    }
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

    // P0 Step 2: data-driven Fast Track terrain. The resolved StagePlan
    // sections are the single source of truth for section boundaries
    // (see constructor). Legacy/procedural stages (sections: []) fall through
    // to the original random generation below, unchanged.
    if (this.isFastTrack && this.fastTrackSections.length > 0) {
      const endX = startX + this.segmentWidth;
      const section = this.resolveFastTrackSection(endX);
      const endY = this.fastTrackSectionY(section, endX);
      this.addSegment(startX, prevY, endX, endY, false);
      return;
    }

    // FAST TRACK FALLBACK (P0 Step 2): Fast Track stages whose stage data does
    // not (yet) define terrain.sections (today: the 3400m 'nijgadh_fast_track')
    // have always rendered the hardcoded 2500m section chain below, with the
    // flat groundY `else` plateau beyond X=2350. That behavior is preserved
    // verbatim until real section data exists - inventing geometry here would
    // be a terrain redesign. This chain is the ONLY remaining hardcoded
    // section-selection logic and exists purely for backward compatibility;
    // stages WITH plan sections never reach it.
    if (this.isFastTrack) {
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

    // P3 Step 2: every non-Fast-Track stage now generates from its own
    // resolved stage data (terrain.profile, minHeight/maxHeight, jumpChance,
    // valleyChance, segmentWidth). The previous fixed distribution (35% flat /
    // 20/20 hills / 13% ramp / 12% valley with fixed 15..50px magnitudes,
    // identical for all 48 legacy stages) is replaced by the profile-weighted,
    // data-bounded generator below.
    this.generateLegacySegment(startX, prevY);
  }

  // Resolve the legacy terrain configuration ONCE per Terrain instance from
  // the already-resolved StagePlan (never per segment). Missing/invalid
  // values fall back to safe defaults so a stage with unexpected data keeps
  // generating playable terrain instead of crashing or producing walls.
  resolveLegacyTerrainConfig() {
    const t = this.stagePlan.terrain || {};
    const fin = (v, fallback) => (typeof v === 'number' && Number.isFinite(v)) ? v : fallback;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const profileKey = LEGACY_TERRAIN_PROFILES[t.profile] ? t.profile : 'rolling_hills';
    const profile = LEGACY_TERRAIN_PROFILES[profileKey];

    // minHeight/maxHeight are stage-data feature heights ABOVE groundY
    // (stages.js: 20 + difficulty*10 / 60 + difficulty*25 -> 30..85 at
    // difficulty 1, 70..185 at difficulty 5). The clamps only guard against
    // invalid/extreme future data; every current stage resolves unchanged.
    const minHeight = clamp(fin(t.minHeight, 30), 10, 120);
    const maxHeight = clamp(fin(t.maxHeight, 85), minHeight, 200);

    // Stage chances -> normalized feature-weight factors. Current data
    // ranges: jumpChance 0.025..0.125 (factor 0.2..1.0), valleyChance
    // 0.14..0.30 (factor ~0.47..1.0). A factor above 1 (future data) stays
    // valid because the final weights are normalized to sum to 1.
    const jumpFactor = clamp(fin(t.jumpChance, 0.1) / 0.125, 0, 2);
    const valleyFactor = clamp(fin(t.valleyChance, 0.25) / 0.3, 0, 2);

    const rampW = profile.rampWeight * jumpFactor;
    const valleyW = profile.valleyWeight * valleyFactor;
    const total = profile.flatWeight + profile.hillWeight + rampW + valleyW;
    const weights = {
      flat: profile.flatWeight / total,
      up: (profile.hillWeight / 2) / total,
      down: (profile.hillWeight / 2) / total,
      ramp: rampW / total,
      valley: valleyW / total
    };

    return {
      profileKey,
      profile,
      minHeight,
      maxHeight,
      weights,
      segmentWidth: clamp(Math.round(fin(t.segmentWidth, 100)), 50, 200)
    };
  }

  // Generate one legacy-stage segment from the resolved stage configuration.
  // Hills/descents are multi-segment "runs" so stage data can express tall
  // elevation (up to maxHeight) without ever creating a vertical wall: run
  // length is stretched until every per-segment step stays inside the slope
  // guard, and every Y is clamped to the stage's elevation envelope.
  generateLegacySegment(startX, prevY) {
    const cfg = this.legacyTerrain;
    const endX = startX + this.segmentWidth;
    const envelopeTop = this.groundY - cfg.maxHeight;  // highest playable Y
    const envelopeBottom = this.groundY + 80;          // deepest playable Y
    const clampY = (y) => Phaser.Math.Clamp(y, envelopeTop, envelopeBottom);
    const MAX_STEP = 45; // per-segment slope guard (runs stretch, never wall)

    // Continue an active multi-segment run (climb/descent, or valley climb-out).
    if (this.legacyRun.remaining > 0 || this.legacyRun.afterRemaining > 0) {
      const inMainPhase = this.legacyRun.remaining > 0;
      const step = inMainPhase ? this.legacyRun.stepY : this.legacyRun.afterStepY;
      if (inMainPhase) this.legacyRun.remaining -= 1;
      else this.legacyRun.afterRemaining -= 1;
      this.addSegment(startX, prevY, endX, clampY(prevY + step), false);
      return;
    }

    // Pick the next feature from the profile-weighted mix (weights already
    // include this stage's jumpChance / valleyChance factors).
    const w = cfg.weights;
    const roll = Math.random();
    let feature;
    if (roll < w.flat) feature = 'flat';
    else if (roll < w.flat + w.up) feature = 'hillUp';
    else if (roll < w.flat + w.up + w.down) feature = 'hillDown';
    else if (roll < w.flat + w.up + w.down + w.ramp) feature = 'ramp';
    else feature = 'valley';

    const band = Math.max(0, cfg.maxHeight - cfg.minHeight);
    const elevationTarget = () =>
      Math.max(8, (cfg.minHeight + Math.random() * band) * cfg.profile.amplitude);

    if (feature === 'flat') {
      this.addSegment(startX, prevY, endX, prevY, true);
      return;
    }

    if (feature === 'ramp') {
      // Single-segment jump feature, bounded by the slope guard.
      const rise = Math.min(MAX_STEP, 20 + Math.random() * Math.max(10, cfg.maxHeight * 0.25));
      this.addSegment(startX, prevY, endX, clampY(prevY - rise), false);
      return;
    }

    if (feature === 'hillUp' || feature === 'hillDown') {
      const goingUp = feature === 'hillUp';
      const delta = goingUp
        ? Math.min(elevationTarget(), prevY - envelopeTop)      // headroom above
        : Math.min(elevationTarget() * 0.8, envelopeBottom - prevY); // floor below
      if (delta < 10) {
        // Too close to the envelope to shape the feature - emit flat ground.
        this.addSegment(startX, prevY, endX, prevY, true);
        return;
      }
      const minLen = Math.ceil(delta / MAX_STEP);
      const wantedLen = cfg.profile.runMin +
        Math.round(Math.random() * (cfg.profile.runMax - cfg.profile.runMin));
      const len = Math.min(8, Math.max(minLen, wantedLen, 1));
      const step = (goingUp ? -1 : 1) * (delta / len);
      this.legacyRun = { remaining: len - 1, afterRemaining: 0, stepY: step, afterStepY: 0 };
      this.addSegment(startX, prevY, endX, clampY(prevY + step), false);
      return;
    }

    // valley: V-shaped dip - descend for `out` segments, then climb back out
    // over `back` segments toward the pre-dip elevation. valleyChance scales
    // how often this feature is chosen; the stage band scales its depth.
    const depth = Math.min(20 + Math.random() * Math.max(20, cfg.maxHeight * 0.35), envelopeBottom - prevY);
    if (depth < 10) {
      this.addSegment(startX, prevY, endX, prevY, true);
      return;
    }
    const out = Math.max(1, Math.min(4, Math.ceil(depth / MAX_STEP)));
    const back = Math.max(1, Math.min(4, Math.ceil(depth / MAX_STEP)));
    // First descent step is emitted below; remaining = out - 1 so the total
    // descent is exactly `depth` and the climb-out returns to the start Y
    // (same convention as the hill-run above).
    this.legacyRun = { remaining: out - 1, afterRemaining: back, stepY: depth / out, afterStepY: -(depth / back) };
    this.addSegment(startX, prevY, endX, clampY(prevY + depth / out), false);
  }

  // ---- P0 Step 2: Fast Track section-selection helpers ----

  // Resolve which plan section owns world/stage X (X is a generated SEGMENT
  // END in stage-space). Deterministic boundary rule, chosen to be EXACTLY
  // equivalent to the legacy hardcoded chain (`endX <= section.end`, tested in
  // ascending order): a boundary X belongs to the section ENDING at that X
  // (right-closed [prevEnd, end] intervals), and anything beyond the last
  // section end stays in the last (finish) section. A naive half-open
  // `start <= x < end` rule would NOT be legacy-equivalent: at X=900 and
  // X=2050 the sine sections land at t=1 (Y=540/570) while the next section's
  // t=0 base differs (bridge 580 / terai 600), which would change terrain.
  resolveFastTrackSection(x) {
    const sections = this.fastTrackSections;
    if (!Array.isArray(sections) || sections.length === 0) return null;
    for (let i = 0; i < sections.length; i++) {
      if (x <= sections[i].end) return sections[i];
    }
    return sections[sections.length - 1];
  }

  // Section elevation shapes - ported 1:1 from the legacy hardcoded chain.
  // `endX` is the segment end being generated (stage-space); `t` normalizes
  // position inside the section exactly as before. Selection keys on
  // section.name first, then section.role, so future Fast Track stages using
  // the same named sections render identically without new Terrain code.
  // Unknown sections render flat at groundY (safe default).
  fastTrackSectionY(section, endX) {
    if (!section) return this.groundY;
    const span = section.end - section.start;
    const t = span > 0 ? (endX - section.start) / span : 0;
    const role = section.role;
    const name = section.name || '';

    // Named sections first (exact names from stage data), because derived
    // roles are coarse: both 'expressway' (amp 40) and 'hill_expressway'
    // (amp 30) derive role 'expressway', so role must never be tested before
    // the exact name.
    if (name === 'valley_start') return this.groundY;
    if (name === 'hill_climb') return this.groundY - t * 80;
    if (name === 'expressway') return (this.groundY - 80) + Math.sin(t * Math.PI) * 40;
    if (name === 'hill_expressway') return (this.groundY - 50) + Math.sin(t * Math.PI) * 30;
    if (name === 'bridge') return this.groundY - 40;
    if (name === 'tunnel_approach') return (this.groundY - 40) + t * 20;
    if (name === 'tunnel') return this.groundY - 20;
    if (name === 'tunnel_exit') return (this.groundY - 20) - t * 30;
    if (name === 'terai_transition') return (this.groundY - 20) + t * 20;
    if (name === 'nijgadh_finish') return this.groundY;

    // Role-based fallback for future Fast Track stages that declare sections
    // by role only (or with new names). A nameless section with role
    // 'expressway' uses the plain-expressway curve; use role 'hill' etc. for
    // other shapes. Unknown shapes render flat at groundY (safe default).
    if (role === 'start' || role === 'finish') return this.groundY;
    if (role === 'hill') return this.groundY - t * 80;
    if (role === 'bridge') return this.groundY - 40;
    if (role === 'tunnel_approach') return (this.groundY - 40) + t * 20;
    if (role === 'tunnel') return this.groundY - 20;
    if (role === 'tunnel_exit') return (this.groundY - 20) - t * 30;
    if (role === 'terai') return (this.groundY - 20) + t * 20;
    if (role === 'expressway') return (this.groundY - 80) + Math.sin(t * Math.PI) * 40;
    return this.groundY;
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
        // Paved Shoulder Sub-base (Width: 30px)
        this.graphics.lineStyle(30, shoulderColor, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(this.segments[0].startX, this.segments[0].startY);
        for (const seg of this.segments) {
          this.graphics.lineTo(seg.endX, seg.endY);
        }
        this.graphics.strokePath();

        // Shoulder Hash Markings / Rumble Strips (Width: 1.5px)
        this.graphics.lineStyle(1.5, 0x566573, 0.6);
        for (let i = 0; i < this.segments.length; i += 2) {
          const seg = this.segments[i];
          const midX = (seg.startX + seg.endX) / 2;
          const midY = (seg.startY + seg.endY) / 2;
          this.graphics.beginPath();
          this.graphics.moveTo(midX - 5, midY + 11);
          this.graphics.lineTo(midX + 5, midY + 14);
          this.graphics.strokePath();
        }

        // Main Controlled-Access Asphalt Surface (Width: 22px)
        this.graphics.lineStyle(22, roadColor, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(this.segments[0].startX, this.segments[0].startY);
        for (const seg of this.segments) {
          this.graphics.lineTo(seg.endX, seg.endY);
        }
        this.graphics.strokePath();

        // Concrete Jersey Median Divider (Top edge visual barrier)
        this.graphics.lineStyle(6, 0x95a5a6, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(this.segments[0].startX, this.segments[0].startY - 14);
        for (const seg of this.segments) {
          this.graphics.lineTo(seg.endX, seg.endY - 14);
        }
        this.graphics.strokePath();

        // Jersey Median Top Cap
        this.graphics.lineStyle(2, 0xbdc3c7, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(this.segments[0].startX, this.segments[0].startY - 17);
        for (const seg of this.segments) {
          this.graphics.lineTo(seg.endX, seg.endY - 17);
        }
        this.graphics.strokePath();

        // Jersey Barrier Block Seams & Reflector Dots
        for (let i = 0; i < this.segments.length; i += 2) {
          const seg = this.segments[i];
          if (Math.floor(seg.startX / 60) % 2 === 0) {
            this.graphics.lineStyle(1.5, 0x566573, 0.8);
            this.graphics.beginPath();
            this.graphics.moveTo(seg.startX, seg.startY - 11);
            this.graphics.lineTo(seg.startX, seg.startY - 17);
            this.graphics.strokePath();
            // Yellow reflector dot on median
            this.graphics.fillStyle(0xf4d03f, 1);
            this.graphics.fillCircle(seg.startX, seg.startY - 14, 1.5);
          }
        }

        // Solid White Outer Highway Edge Line (Top Edge)
        this.graphics.lineStyle(3, edgeColor, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(this.segments[0].startX, this.segments[0].startY - 10);
        for (const seg of this.segments) {
          this.graphics.lineTo(seg.endX, seg.endY - 10);
        }
        this.graphics.strokePath();

        // Solid White Outer Highway Edge Line (Bottom Edge)
        this.graphics.lineStyle(2, 0xd5dbdb, 0.9);
        this.graphics.beginPath();
        this.graphics.moveTo(this.segments[0].startX, this.segments[0].startY + 10);
        for (const seg of this.segments) {
          this.graphics.lineTo(seg.endX, seg.endY + 10);
        }
        this.graphics.strokePath();

        // Center Double Yellow Dash Lane Markings along Segment Slope
        this.graphics.lineStyle(2, dashColor, 0.95);
        for (let i = 0; i < this.segments.length; i += 2) {
          const seg = this.segments[i];
          const midX = (seg.startX + seg.endX) / 2;
          const midY = (seg.startY + seg.endY) / 2;
          const angle = Math.atan2(seg.endY - seg.startY, seg.endX - seg.startX);
          const dx = Math.cos(angle) * 16;
          const dy = Math.sin(angle) * 16;

          // Line 1
          this.graphics.beginPath();
          this.graphics.moveTo(midX - dx, midY - dy - 1.5);
          this.graphics.lineTo(midX + dx, midY + dy - 1.5);
          this.graphics.strokePath();

          // Line 2
          this.graphics.beginPath();
          this.graphics.moveTo(midX - dx, midY - dy + 1.5);
          this.graphics.lineTo(midX + dx, midY + dy + 1.5);
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
