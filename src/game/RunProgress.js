// ============================================
// Nepali Racer - Run Progress (Milestones + Difficulty)
// ============================================
// Pure, data-driven, Phaser-free resolvers for endless normal-stage runs.
// Everything derives from world distance only — no Math.random, no scene
// state, fully deterministic and unit-testable.

// Milestone every 275m, first at 275m: 275, 550, 825, 1100, ...
export const MILESTONE_INTERVAL = 275;

// Data-driven milestone reward bases (modest; never economy-inflating).
export const MILESTONE_COINS = 5;       // coins per milestone
export const BONUS_EVERY = 4;           // every 4th milestone adds a diamond
export const BONUS_DIAMONDS = 1;        // diamond bonus amount
export const BONUS_FUEL_EVERY = 8;      // every 8th milestone adds fuel
export const BONUS_FUEL = 15;           // fuel bonus amount

// Number of the milestone reached at a given distance (0 before the first).
export function milestoneIndexAt(distance) {
  const d = (typeof distance === 'number' && Number.isFinite(distance)) ? Math.max(0, distance) : 0;
  return Math.floor(d / MILESTONE_INTERVAL);
}

// World X of the Nth milestone (1-based).
export function milestoneDistanceAt(index) {
  return index * MILESTONE_INTERVAL;
}

// World X of the next milestone after the given distance.
export function nextMilestoneDistance(distance) {
  return (milestoneIndexAt(distance) + 1) * MILESTONE_INTERVAL;
}

// Data-driven reward for the Nth milestone (awarded exactly once per index).
export function milestoneReward(index) {
  const coins = MILESTONE_COINS;
  const diamonds = (index > 0 && index % BONUS_EVERY === 0) ? BONUS_DIAMONDS : 0;
  const fuel = (index > 0 && index % BONUS_FUEL_EVERY === 0) ? BONUS_FUEL : 0;
  return { coins, diamonds, fuel };
}

// Distance-based difficulty tiers (data-driven; factor 0..1 scales difficulty).
// factor is designed to scale SAFE levers (milestone rewards, HUD tag) only —
// it never feeds terrain collision, so it cannot create impossible slopes.
export const DIFFICULTY_TIERS = Object.freeze([
  { max: 300, tier: 0, label: 'EASY', factor: 0.0 },
  { max: 750, tier: 1, label: 'MODERATE', factor: 0.25 },
  { max: 1500, tier: 2, label: 'CHALLENGING', factor: 0.5 },
  { max: 3000, tier: 3, label: 'HARD', factor: 0.75 },
  { max: Number.POSITIVE_INFINITY, tier: 4, label: 'ADVANCED', factor: 1.0 }
]);

// Resolve the difficulty tier descriptor for a world X.
export function resolveDifficulty(worldX) {
  const d = (typeof worldX === 'number' && Number.isFinite(worldX)) ? Math.max(0, worldX) : 0;
  for (const tier of DIFFICULTY_TIERS) {
    if (d < tier.max) return { tier: tier.tier, label: tier.label, factor: tier.factor };
  }
  return { tier: 4, label: 'ADVANCED', factor: 1.0 };
}

// ---------------------------------------------------------------
// Bonus Resolver (P9) — pure, data-driven thresholds + rewards.
// Stateful once-per-event/cooldown guards live in the scene; this module only
// owns the DATA and the pure decision helpers (no Math.random, testable).
// All bonuses are modest so the existing coin/diamond economy is not inflated.
// ---------------------------------------------------------------

// AIR TIME: seconds airborne before an air-time bonus is earned (per jump).
export const AIR_TIME_THRESHOLD_S = 1.2;
export const AIR_TIME_BONUS = 20;      // coins

// LONG JUMP: seconds airborne for the bigger long-jump bonus (per jump).
export const LONG_JUMP_THRESHOLD_S = 2.0;
export const LONG_JUMP_BONUS = 30;     // coins

// NEW RECORD: coins when the current run passes the stored best distance.
export const RECORD_BONUS = 40;        // coins

// STAGE TARGET: coins when the endless run passes the stage target distance.
export const TARGET_BONUS = 50;        // coins

// Decide the airborne bonus for a completed jump's air-seconds (0 = none).
export function airborneBonus(airSeconds) {
  if (typeof airSeconds !== 'number' || !Number.isFinite(airSeconds)) return null;
  if (airSeconds >= LONG_JUMP_THRESHOLD_S) {
    return { type: 'longJump', label: 'LONG JUMP!', coins: LONG_JUMP_BONUS };
  }
  if (airSeconds >= AIR_TIME_THRESHOLD_S) {
    return { type: 'airTime', label: 'AIR TIME', coins: AIR_TIME_BONUS };
  }
  return null;
}

// New-record crossing bonus (awarded at most once per run by the caller).
export function recordBonus() {
  return { type: 'record', label: 'NEW RECORD!', coins: RECORD_BONUS };
}

// Stage-target crossing bonus (awarded at most once per run by the caller).
export function targetBonus() {
  return { type: 'target', label: 'TARGET REACHED!', coins: TARGET_BONUS };
}

export default {
  MILESTONE_INTERVAL,
  milestoneIndexAt,
  milestoneDistanceAt,
  nextMilestoneDistance,
  milestoneReward,
  DIFFICULTY_TIERS,
  resolveDifficulty,
  AIR_TIME_THRESHOLD_S,
  AIR_TIME_BONUS,
  LONG_JUMP_THRESHOLD_S,
  LONG_JUMP_BONUS,
  RECORD_BONUS,
  TARGET_BONUS,
  airborneBonus,
  recordBonus,
  targetBonus
};