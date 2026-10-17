// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Turns the level values of a qualification-level finding into readable labels. The backend sends a level as its
 * QualificationLevel enum name ("Proficient"); a numeric string ("3") is accepted as well.
 * @param value - Level as enum name or number
 * @param translate - Translation lookup used for the level label
 * @param params - Comment params of a qualification-level finding
 */
import { QualificationLevel } from 'src/app/domain/enums/qualification-level.enum';
import { QUALIFICATION_LEVEL_VALIDATION } from 'src/app/domain/constants/qualification-level-validation.constants';

export function qualificationLevelLabelKey(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const byName = (QualificationLevel as unknown as Record<string, number | string>)[trimmed];
  const level = typeof byName === 'number' ? byName : Number(trimmed);
  return Number.isInteger(level) && QualificationLevel[level] !== undefined
    ? `${QUALIFICATION_LEVEL_VALIDATION.LEVEL_LABEL_KEY_PREFIX}${level}`
    : null;
}

export function qualificationLevelLabel(
  value: string | undefined | null,
  translate: (key: string) => string,
): string {
  const key = qualificationLevelLabelKey(value);
  return key ? translate(key) : (value ?? '');
}

export function hasHeldQualificationLevel(params: Record<string, string> | undefined | null): boolean {
  return !!params?.[QUALIFICATION_LEVEL_VALIDATION.HELD_LEVEL_PARAM];
}

export function localizeQualificationLevelParams(
  params: Record<string, string>,
  translate: (key: string) => string,
): Record<string, string> {
  const localized = { ...params };
  for (const param of [QUALIFICATION_LEVEL_VALIDATION.MIN_LEVEL_PARAM, QUALIFICATION_LEVEL_VALIDATION.HELD_LEVEL_PARAM]) {
    if (localized[param]) {
      localized[param] = qualificationLevelLabel(localized[param], translate);
    }
  }
  return localized;
}
