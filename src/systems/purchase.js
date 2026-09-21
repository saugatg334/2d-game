// ============================================
// Nepali Racer - Shared Purchase / Unlock Helper
// ============================================
// P6B: one shared purchase flow for characters, vehicles and stages so the
// Select scenes and the Shop behave identically. Reuses the existing SaveSystem
// as the single source of truth for currency and unlock state — no duplicate
// currency/unlock system is created.
//
// Safety contract (mirrors ShopScene's F5 rules):
//   1. validate the item (id, currency, finite non-negative cost)
//   2. reject double purchase (already-unlocked check)
//   3. check balance BEFORE touching currency
//   4. deduct via spendCoins/spendDiamonds (balance-guarded, never negative)
//   5. unlock + persist only after the deduction succeeded
//
// Stage-specific: `unlockStageWithProgression` preserves the existing
// sequential progression gate from StageProgression.js — a stage whose previous
// stage is not completed can NEVER be unlocked by currency, with or without
// enough balance. Progression is checked FIRST so an out-of-order purchase can
// never deduct currency (previously money could be spent on a stage that
// gameplay-entry validation would immediately block).

import { isStageProgressionUnlocked } from '../game/StageProgression.js';

const GET_BALANCE = { coins: 'getCoins', diamonds: 'getDiamonds' };
const SPEND = { coins: 'spendCoins', diamonds: 'spendDiamonds' };

/** Category-specific already-unlocked check (single source: SaveSystem). */
function isAlreadyUnlocked(saveSystem, kind, id) {
  if (kind === 'character') return saveSystem.isCharacterUnlocked(id);
  if (kind === 'vehicle') return saveSystem.isVehicleUnlocked(id);
  return saveSystem.isStageUnlocked(id);
}

/**
 * Core purchase routine shared by all three categories.
 * Returns a machine-readable result so UIs can show precise messages.
 *
 * @param {object} saveSystem
 * @param {'character'|'vehicle'|'stage'} kind
 * @param {{id: string, cost: number, currency: 'coins'|'diamonds'}} item
 * @returns {{ok: boolean, reason?: 'invalid'|'already_unlocked'|'insufficient'|'spend_failed', message?: string}}
 */
function buyUnlockable(saveSystem, kind, item) {
  // 1. F5-style validation before any mutation.
  if (!item || typeof item !== 'object') return { ok: false, reason: 'invalid' };
  if (typeof item.id !== 'string' || item.id.trim() === '') return { ok: false, reason: 'invalid' };
  if (item.currency !== 'coins' && item.currency !== 'diamonds') return { ok: false, reason: 'invalid' };
  if (typeof item.cost !== 'number' || !Number.isFinite(item.cost) || item.cost < 0) return { ok: false, reason: 'invalid' };

  const { id, cost, currency } = item;

  // 2. Double-purchase guard (already unlocked -> no deduction, no dup record).
  if (isAlreadyUnlocked(saveSystem, kind, id)) {
    return { ok: false, reason: 'already_unlocked', message: 'Already unlocked!' };
  }

  // 3. Balance check BEFORE any deduction.
  const balance = saveSystem[GET_BALANCE[currency]]();
  if (!Number.isFinite(balance) || balance < cost) {
    return {
      ok: false,
      reason: 'insufficient',
      message: `Not enough ${currency}! Need ${cost}, you have ${Number.isFinite(balance) ? balance : 0}.`
    };
  }

  // 4. Deduct (spendX is balance-guarded and persists via save()).
  const spent = saveSystem[SPEND[currency]](cost);
  if (!spent) return { ok: false, reason: 'spend_failed' };

  // 5. Unlock + persist (unlockX dedupes and saves).
  if (kind === 'character') saveSystem.unlockCharacter(id);
  else if (kind === 'vehicle') saveSystem.unlockVehicle(id);
  else saveSystem.unlockStage(id);

  return { ok: true };
}

/** Purchase a character. */
export function buyCharacter(saveSystem, item) {
  return buyUnlockable(saveSystem, 'character', item);
}

/** Purchase a vehicle. */
export function buyVehicle(saveSystem, item) {
  return buyUnlockable(saveSystem, 'vehicle', item);
}

/**
 * Stage purchase WITHOUT the progression gate (Shop "direct purchase" surface
 * for shop-only presentation). Select scenes must use
 * unlockStageWithProgression so sequential progression is preserved.
 */
export function buyStage(saveSystem, item) {
  return buyUnlockable(saveSystem, 'stage', item);
}

/**
 * Stage purchase that preserves the sequential progression gate: requires BOTH
 * (a) the previous main stage completed, and (b) enough currency. Returns the
 * same result shape as buyUnlockable, with `alsoNeedsProgression: true` when
 * only the progression gate failed.
 */
export function unlockStageWithProgression(saveSystem, item) {
  // Progression gate FIRST: currency is never touched when progression fails.
  if (!isStageProgressionUnlocked(item && item.id, saveSystem.data)) {
    return {
      ok: false,
      reason: 'progression_locked',
      alsoNeedsProgression: true,
      message: 'Complete the previous stage first!'
    };
  }
  return buyUnlockable(saveSystem, 'stage', item);
}
