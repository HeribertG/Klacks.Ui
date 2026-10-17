// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Keys of a "qualification held below the required level" finding (error list and refused booking). The backend
 * sends the levels as QualificationLevel enum names and the number of missing levels as a string.
 * @param KEY - Backend validation key (QualificationValidationKeys.InsufficientLevel)
 * @param DETAIL_KEY - UI-only text used instead of KEY when the held level is known
 * @param MIN_LEVEL_PARAM - Param carrying the required minimum level
 * @param HELD_LEVEL_PARAM - Param carrying the highest level the person holds
 * @param LEVEL_DELTA_PARAM - Param carrying the number of missing levels
 * @param LEVEL_LABEL_KEY_PREFIX - Prefix of the level label keys (followed by the numeric level 1..5)
 */
export const QUALIFICATION_LEVEL_VALIDATION = {
  KEY: 'schedule.error-list.qualification-level',
  DETAIL_KEY: 'schedule.error-list.qualification-level-detail',
  MIN_LEVEL_PARAM: 'minLevel',
  HELD_LEVEL_PARAM: 'heldLevel',
  LEVEL_DELTA_PARAM: 'levelDelta',
  LEVEL_LABEL_KEY_PREFIX: 'shift.edit-shift.qualifications.level.',
} as const;
