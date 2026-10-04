// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared presentation rules for planning-rule validation entries (live error panel and wizard dialogs): the rule
 * kind is shown by its translated name, the rule id only as tooltip.
 * @param comment - Translation key of the validation entry
 * @param params - Translation parameters as received from the backend
 * @param translate - Resolves a translation key in the reader's current language
 */

import {
  PLANNING_RULE_ID_PARAM,
  PLANNING_RULE_KIND_KEY_PREFIX,
  PLANNING_RULE_KIND_PARAM,
  SCHEDULE_VALIDATION_KEY_PLANNING_RULE,
  SCHEDULE_VALIDATION_KEY_PLANNING_RULE_INVALID,
} from 'src/app/domain/constants/schedule-validation-keys.constants';

export function isPlanningRuleKey(comment: string): boolean {
  return (
    comment === SCHEDULE_VALIDATION_KEY_PLANNING_RULE ||
    comment === SCHEDULE_VALIDATION_KEY_PLANNING_RULE_INVALID
  );
}

export function planningRuleTooltip(
  comment: string,
  params: Record<string, string> | undefined,
): string | undefined {
  return isPlanningRuleKey(comment) ? params?.[PLANNING_RULE_ID_PARAM] : undefined;
}

export function localizePlanningRuleKind(
  comment: string,
  params: Record<string, string> | undefined,
  translate: (key: string) => string,
): Record<string, string> | undefined {
  const kind = params?.[PLANNING_RULE_KIND_PARAM];
  if (!params || !kind || !isPlanningRuleKey(comment)) {
    return params;
  }

  return {
    ...params,
    [PLANNING_RULE_KIND_PARAM]: translate(`${PLANNING_RULE_KIND_KEY_PREFIX}${kind.toLowerCase()}`),
  };
}
