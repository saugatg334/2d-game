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

// Accept only finite numbers; anything else (missing, NaN, Infinity, strings)
// falls back to the safe default so NaN/Infinity can never reach fuel math.
const toFiniteNumber = (value, fallback) =>
  (typeof value === 'number' && Number.isFinite(value)) ? value : fallback;

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
 */
export function resolveVehicleTuning(vehicleStats, characterData) {
  const stats = (vehicleStats && typeof vehicleStats === 'object') ? vehicleStats : {};
  const bonuses = (characterData && characterData.bonuses && typeof characterData.bonuses === 'object')
    ? characterData.bonuses
    : {};

  const fuelCapacity = toFiniteNumber(stats.fuelCapacity, DEFAULT_FUEL_CAPACITY);
  const fuelConsumption = toFiniteNumber(stats.fuelConsumption, DEFAULT_FUEL_CONSUMPTION);
  const fuelEfficiency = Math.max(0, Math.min(1, toFiniteNumber(bonuses.fuelEfficiency, 0)));

  return { fuelCapacity, fuelConsumption, fuelEfficiency };
}

export default resolveVehicleTuning;
