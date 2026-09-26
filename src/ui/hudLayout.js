// ============================================
// Nepali Racer - HUD Zone Layout (P11)
// ============================================
// Pure, Phaser-free geometry for the GameScene HUD's three zones
// (left = resources, center = progress, right = target/best + pause).
// Single source of truth shared by GameScene.createHUD() and
// qa/HudZoneHarness.mjs so the tested layout IS the rendered layout.
//
// Under the shipped Phaser Scale.FIT (1280x720 design space) the scale is
// always 1; the proportional squeeze below is a safety fallback for narrower
// scene widths (tests / non-FIT hosts) so zones can never overlap.

export const HUD_ZONE = Object.freeze({
  PAD: 12,       // outer screen padding
  GAP: 16,       // minimum gap between zones
  LEFT_W: 192,   // left resource panel
  LEFT_H: 108,
  RIGHT_W: 224,  // right target/best panel
  RIGHT_H: 100,
  CENTER_W: 220, // center progress zone (milestone bar width)
  CENTER_H: 112, // clears the ability HUD block (y18-52) at top-center
  MIN_SCALE: 0.5
});

function finiteWidth(w) {
  return (typeof w === 'number' && Number.isFinite(w) && w > 0) ? w : 1280;
}

// Zone rects in scene space. pauseBtn x/y is the button CENTER point.
export function computeHudZoneRects(w) {
  const width = finiteWidth(w);
  const { PAD, GAP, LEFT_W, LEFT_H, RIGHT_W, RIGHT_H, CENTER_W, CENTER_H, MIN_SCALE } = HUD_ZONE;
  const total = LEFT_W + CENTER_W + RIGHT_W;
  const s = width >= total + 2 * PAD + 3 * GAP
    ? 1
    : Math.max(MIN_SCALE, (width - 2 * PAD - 3 * GAP) / total);
  const lw = LEFT_W * s;
  const rw = RIGHT_W * s;
  const cw = CENTER_W * s;
  const left = { x: PAD, y: PAD, w: lw, h: LEFT_H * s };
  const right = { x: width - PAD - rw, y: PAD, w: rw, h: RIGHT_H * s };
  const center = { x: width / 2 - cw / 2, y: PAD, w: cw, h: CENTER_H * s };
  const pauseBtn = {
    x: right.x + rw - 16 * s, // center x (inside right panel, top-right corner)
    y: right.y + 14 * s,      // center y
    w: 28 * s,
    h: 24 * s
  };
  return { scale: s, width, left, center, right, pauseBtn };
}

// Pairwise axis-aligned rect overlap (edge-touch counts as overlap-free).
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function zonesOverlap(rects) {
  const zones = [rects.left, rects.center, rects.right];
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      if (rectsOverlap(zones[i], zones[j])) return true;
    }
  }
  return false;
}
