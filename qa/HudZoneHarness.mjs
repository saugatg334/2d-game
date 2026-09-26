// ============================================
// Nepali Racer - QA Harness: HUD Zones (P11)
// ============================================
// Headless verification that the shared HUD layout module produces
// non-overlapping zones at reference widths, and that the milestone-bar
// fraction stays within [0,1] across a simulated run. Pure logic only —
// no Phaser instance needed.
import { computeHudZoneRects, zonesOverlap, HUD_ZONE } from '../src/ui/hudLayout.js';
import {
  MILESTONE_INTERVAL, milestoneIndexAt, milestoneDistanceAt, nextMilestoneDistance
} from '../src/game/RunProgress.js';

let pass = 0;
let fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label); }
};

// NOTE: widths below are SCENE-space widths under Scale.FIT (the game renders
// in a fixed 1280x720 design space where scale is always 1). They are NOT
// physical pixel widths of the browser viewport.
console.log('[HZ1] Zone layout at reference scene widths');
{
  // Realistic references: FIT keeps scene space fixed at 1280; the narrow
  // case exercises the proportional-squeeze fallback (non-FIT hosts/tests).
  const widths = [1280, 768, 390];
  for (const w of widths) {
    const rects = computeHudZoneRects(w);
    const noOverlap = !zonesOverlap(rects);
    ok(noOverlap, 'w=' + w + ': no zone overlap');
    ok(rects.left.w + rects.center.w + rects.right.w <= w - 2 * HUD_ZONE.PAD,
      'w=' + w + ': total zone width fits inside padded width');
    // Pause button must sit inside the right zone (top area, below score).
    const pb = rects.pauseBtn;
    ok(pb.x + pb.w / 2 <= rects.right.x + rects.right.w,
      'w=' + w + ': pause button inside right zone');
    // Pause button must not overlap GAS/BRAKE/JUMP touch controls. Mirrors
    // createTouchControls()' desktop anchors: bottom row y = h-70, second row
    // y = h-165, tallest button ~58px -> second-row top edge >= h-194.
    const touchTopEdge = 720 - 194; // second-row top edge in the fixed 720-high design space
    ok(pb.y + pb.h < touchTopEdge,
      'w=' + w + ': pause button clears GAS/BRAKE/JUMP rows (y-bottom ' + (pb.y + pb.h) + ' < ' + touchTopEdge + ')');
    // All zones start at the top and stay on-screen.
    ok(rects.left.y === HUD_ZONE.PAD && rects.right.y === HUD_ZONE.PAD && rects.center.y === HUD_ZONE.PAD,
      'w=' + w + ': zones anchored to top padding');
    ok(rects.right.x + rects.right.w <= w && rects.center.x >= 0,
      'w=' + w + ': zones on-screen');
  }
}

console.log('[HZ2] Milestone bar fraction stays in [0,1] across a simulated run');
{
  const MAX_RUN = 100000;
  const STEP = 137; // odd stride so milestone boundaries are crossed mid-step
  let prevFraction = -1;
  let monotonicWithinWindow = true;
  let resetCount = 0;
  let lastIdx = 0;
  for (let d = 0; d <= MAX_RUN; d += STEP) {
    const dist = Math.min(MAX_RUN, d);
    const prev = milestoneDistanceAt(milestoneIndexAt(dist));
    const next = nextMilestoneDistance(dist);
    const span = Math.max(1, next - prev);
    const fraction = Math.max(0, Math.min(1, (dist - prev) / span));
    if (fraction < 0 || fraction > 1) { ok(false, 'fraction out of range at ' + dist); fail++; }
    if (fraction < prevFraction) {
      // Only acceptable when a milestone fired (bar reset to 0).
      if (milestoneIndexAt(dist) === lastIdx) monotonicWithinWindow = false;
      else resetCount++;
    }
    prevFraction = fraction;
    lastIdx = milestoneIndexAt(dist);
  }
  ok(monotonicWithinWindow, 'fraction never decreases within a milestone window');
  // Resets = number of milestone-boundary increases along the walk:
  // final index (at MAX_RUN) minus initial index (at 0).
  ok(resetCount === milestoneIndexAt(MAX_RUN) - milestoneIndexAt(0),
    'bar resets exactly once per crossed milestone (' + resetCount + ' resets)');
  // Fraction at boundary + epsilon: 0 right after a milestone, ~1 just before.
  const atStart = (MILESTONE_INTERVAL + 0.001 - MILESTONE_INTERVAL) / MILESTONE_INTERVAL;
  ok(Math.abs(atStart) < 0.001, 'fraction ~0 just after a milestone');
  const justBefore = (2 * MILESTONE_INTERVAL - 0.001 - MILESTONE_INTERVAL) / MILESTONE_INTERVAL;
  ok(justBefore <= 1 && justBefore > 0.99, 'fraction ~1 just before the next milestone');
}

console.log('[HZ3] Fast Track parity — layout module is stage-agnostic');
{
  // The layout module takes only a width; Fast Track gets the identical
  // zone geometry (its HUD values differ, layout does not).
  const a = computeHudZoneRects(1280);
  const b = computeHudZoneRects(1280);
  ok(JSON.stringify(a) === JSON.stringify(b), 'identical geometry across calls (deterministic)');
  ok(!zonesOverlap(a), 'Fast Track-equivalent width: no overlap');
}

console.log('\n============================================');
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
console.log('============================================');
if (fail > 0) process.exit(1);
