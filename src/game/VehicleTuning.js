// ============================================
// Nepali Racer - Vehicle Tuning Resolver
// ============================================

// P0 Step 6B: Pure, data-driven resolution of vehicle tuning values, following
// the existing StagePlan architecture (data in -> resolved values out, no side
// effects, safe to unit-test without a scene). Only the FUEL domain is wired in
// this step; grip/suspension/stability/mass/weight/coinMultiplier/specialAbility
// remain untouched.

const DEFAULT_FUEL_CAPACITY = 100;   // matches FUEL.MAX and every existing vehicle record
const DEFAULT_FUEL_CONSUMPTION = 2;  // matches FUEL.CONSUMPTION_RATE and the tempo/default record

// P0 Step 6C: ground friction domain. Default equals PHYSICS.GROUND_FRICTION so
// grip = 1 (tempo/default) resolves to exactly 0.96. Existing data grip range is
// 0.85..1.45 -> formula output 0.9529..0.9724, so the [0.5, 0.995] clamp only
// guards against invalid physics (friction <= 0 or >= 1) and never alters any
// existing vehicle's intended result.
const DEFAULT_GROUND_FRICTION = 0.96; // = PHYSICS.GROUND_FRICTION
const GROUND_FRICTION_MIN = 0.5;
const GROUND_FRICTION_MAX = 0.995;

// Accept only finite numbers; anything else (missing, NaN, Infinity, strings)
// falls back to the safe default so NaN/Infinity can never reach fuel math.
const toFiniteNumber = (value, fallback) =>
  (typeof value === 'number' && Number.isFinite(value)) ? value : fallback;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Resolve vehicle tuning for one vehicle + character pair.
 *
 * Fuel domain:
 *   - fuelCapacity:    vehicle stats value (all current records: 100), fallback 100.
 *   - fuelConsumption: vehicle stats value (tempo/default: 2), fallback 2.
 *   - fuelEfficiency:  character bonus (missing/invalid -> 0), clamped to [0, 1].
 *
 * Burn formula (identical to the pre-6B GameScene.consumeFuel() calculation):
 *   consumption = fuelConsumption * dt * throttleMultiplier * max(0, 1 - fuelEfficiency)
 * fuelEfficiency is resolved here so it can only ever be applied exactly once.
 *
 * Ground friction domain (Step 6C):
 *   groundFriction = clamp(1 - (1 - 0.96) / grip, 0.5, 0.995)
 * grip = 1 resolves to exactly 0.96 (the previous hardcoded value), higher grip
 * retains more velocity per frame, lower grip slows down faster.
 */
export function resolveVehicleTuning(vehicleStats, characterData) {
  const stats = (vehicleStats && typeof vehicleStats === 'object') ? vehicleStats : {};
  const bonuses = (characterData && characterData.bonuses && typeof characterData.bonuses === 'object')
    ? characterData.bonuses
    : {};

  const fuelCapacity = toFiniteNumber(stats.fuelCapacity, DEFAULT_FUEL_CAPACITY);
  const fuelConsumption = toFiniteNumber(stats.fuelConsumption, DEFAULT_FUEL_CONSUMPTION);
  const fuelEfficiency = Math.max(0, Math.min(1, toFiniteNumber(bonuses.fuelEfficiency, 0)));

  // P0 Step 6C: grip -> ground friction, resolved once. Valid finite positive
  // grip uses the audited balance-preserving formula; missing/invalid/
  // non-positive grip falls back to 1 (=> exactly 0.96). Character handling is
  // intentionally NOT multiplied in — the current runtime never did that.
  const gripRaw = toFiniteNumber(stats.grip, 1);
  const grip = gripRaw > 0 ? gripRaw : 1;
  const groundFriction = clamp(
    1 - (1 - DEFAULT_GROUND_FRICTION) / grip,
    GROUND_FRICTION_MIN,
    GROUND_FRICTION_MAX
  );

  return { fuelCapacity, fuelConsumption, fuelEfficiency, groundFriction };
}

export default resolveVehicleTuning;
