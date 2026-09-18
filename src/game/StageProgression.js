// ============================================
// Nepali Racer - Sequential Stage Progression (P3 Step 3)
// ============================================
// Pure, side-effect-free helpers that gate which main stages a player may
// play based on completion order.
//
// Rules (all derived from the actual `stages` array ordering — nothing is
// hardcoded):
//   - The FIRST main stage has no previous-stage requirement.
//   - Every later main stage requires its immediately-previous main stage to
//     be present in the persisted `completedStages` list.
//   - `isStageProgressionUnlocked` ONLY evaluates the completion-order gate.
//     It never touches currency/ownership — those stay in SaveSystem.
//   - `isStagePlayable` = progression gate AND the existing currency/ownership
//     requirement (SaveSystem.isStageUnlocked). It is the single combined check
//     reused by both the StageSelect UI and the gameplay-entry guard, so a
//     purchased later stage can never bypass the previous-stage requirement.
//
// moon_bonus (src/data/bonusStages.js) is intentionally NOT in the `stages`
// array, so it is excluded from sequential progression and remains
// validation-only/non-playable exactly as before.

import { stages } from '../data/stages.js';

/**
 * True when the previous main stage in `stages` ordering has been completed.
 * Unknown ids and any id not present in the main `stages` array (e.g.
 * moon_bonus) return false.
 *
 * @param {string} stageId
 * @param {{ completedStages?: string[] }} saveData
 * @returns {boolean}
 */
export function isStageProgressionUnlocked(stageId, saveData) {
  if (typeof stageId !== 'string' || stageId === '') return false;

  const completed = (saveData && Array.isArray(saveData.completedStages))
    ? saveData.completedStages
    : [];

  const index = stages.findIndex(s => s.id === stageId);
  if (index < 0) return false; // not a main stage -> not progression-eligible

  // First main stage: no previous-stage requirement.
  if (index === 0) return true;

  // Every later main stage requires the immediately-previous main stage.
  const previousStageId = stages[index - 1].id;
  return completed.includes(previousStageId);
}

/**
 * Combined gate used by both UI and gameplay-entry validation:
 *   progression unlocked AND existing currency/ownership requirement met.
 *
 * @param {string} stageId
 * @param {object} saveSystem saveSystem singleton (provides .data + isStageUnlocked)
 * @returns {boolean}
 */
export function isStagePlayable(stageId, saveSystem) {
  if (!isStageProgressionUnlocked(stageId, saveSystem.data)) return false;
  // Preserve the existing ownership/currency (and DEV fast-track) rule as-is.
  return saveSystem.isStageUnlocked(stageId);
}

export default isStageProgressionUnlocked;