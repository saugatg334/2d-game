// ============================================
// Nepali Racer - Character Ability Resolver
// ============================================

// P0 Step 6H: Pure, Phaser-independent resolution of character special
// abilities, following the existing StagePlan/VehicleTuning architecture
// (data in -> resolved values out, no side effects, unit-testable without a
// scene). Behavior-preserving refactor: the values previously hardcoded in
// GameScene (duration 8, boost literals) now live in characters.js and are
// resolved here exactly as before.
//
// Returns BOOST FACTORS (multipliers), never absolute vehicle stats — the
// factors compound on top of Vehicle.baseStats in applyAbilityBoosts().
//
// economy fields (fuelEfficiency / coinBonus) are deliberately NOT included:
// the previous hardcoded literal contained them but Vehicle always ignored
// them, so they must remain non-functional.

// Mirror of the previous runtime fallbacks:
//   cooldown: characterAbility.cooldown || 45      (GameScene)
//   duration: 8                                    (GameScene literal)
//   airControl: boosts.airControl || 0.3           (Vehicle.applyAbilityBoosts)
const DEFAULT_COOLDOWN = 45;
const DEFAULT_DURATION = 8;
const DEFAULT_AIR_CONTROL = 0.3;

const toFiniteNumber = (value, fallback) =>
  (typeof value === 'number' && Number.isFinite(value)) ? value : fallback;

// Boost factor: missing/invalid -> 0 (no boost), matching the previous
// `(boosts.x || 0)` reads in Vehicle.applyAbilityBoosts. airControl is the
// documented exception: its fallback was 0.3.
const toBoostFactor = (value, fallback = 0) => {
  const v = toFiniteNumber(value, fallback);
  return v > 0 ? v : fallback;
};

/**
 * Resolve the special ability for one character.
 *
 * @param {object|null} characterData Character record from characters.js.
 * @returns {object|null} null when the character has no (valid) specialAbility;
 *   otherwise { available, id, name, description, duration, cooldown, boosts }.
 */
export function resolveCharacterAbility(characterData) {
  const ability = (characterData && typeof characterData === 'object')
    ? characterData.specialAbility
    : null;
  // Same gate as the previous `|| null` in GameScene.create(): ANY truthy
  // specialAbility enables the ability (old code read properties off it with
  // fallbacks, so truthy non-objects resolved to default tuning). Property
  // reads on primitives are safe (undefined), so semantics match exactly.
  if (!ability) return null;

  const rawBoosts = (ability.boosts && typeof ability.boosts === 'object')
    ? ability.boosts
    : {};
  const cooldown = toFiniteNumber(ability.cooldown, DEFAULT_COOLDOWN);
  const duration = toFiniteNumber(ability.duration, DEFAULT_DURATION);

  return {
    available: true,
    id: typeof ability.id === 'string' ? ability.id : '',
    name: typeof ability.name === 'string' ? ability.name : '',
    description: typeof ability.description === 'string' ? ability.description : '',
    cooldown: cooldown > 0 ? cooldown : DEFAULT_COOLDOWN,
    duration: duration > 0 ? duration : DEFAULT_DURATION,
    boosts: {
      acceleration: toBoostFactor(rawBoosts.acceleration),
      maxSpeed: toBoostFactor(rawBoosts.maxSpeed),
      airControl: toBoostFactor(rawBoosts.airControl, DEFAULT_AIR_CONTROL),
    },
  };
}

export default resolveCharacterAbility;
