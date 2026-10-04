// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  isPlanningRuleKey,
  localizePlanningRuleKind,
  planningRuleTooltip,
} from './planning-rule-entry.helper';

const PLANNING_RULE = 'schedule.error-list.planning-rule';
const PLANNING_RULE_INVALID = 'schedule.error-list.planning-rule-invalid';
const OTHER_KEY = 'schedule.error-list.overtime';
const translate = (key: string) => `T(${key})`;

describe('planning-rule-entry.helper', () => {
  it('recognises both planning-rule keys', () => {
    expect(isPlanningRuleKey(PLANNING_RULE)).toBe(true);
    expect(isPlanningRuleKey(PLANNING_RULE_INVALID)).toBe(true);
    expect(isPlanningRuleKey(OTHER_KEY)).toBe(false);
  });

  it('uses the rule id as tooltip only for planning-rule entries', () => {
    expect(planningRuleTooltip(PLANNING_RULE_INVALID, { ruleId: 'r1' })).toBe('r1');
    expect(planningRuleTooltip(OTHER_KEY, { ruleId: 'r1' })).toBeUndefined();
    expect(planningRuleTooltip(PLANNING_RULE, undefined)).toBeUndefined();
  });

  it('replaces the rule kind by its translated name', () => {
    const params = { kind: 'MaxConsecutiveOfKind', ruleId: 'r1' };
    expect(localizePlanningRuleKind(PLANNING_RULE, params, translate)).toEqual({
      kind: 'T(planning-rule-kind.maxconsecutiveofkind)',
      ruleId: 'r1',
    });
    expect(params.kind).toBe('MaxConsecutiveOfKind');
  });

  it('leaves params without kind or of other keys untouched', () => {
    const invalid = { ruleId: 'r1' };
    const other = { kind: 'X' };
    expect(localizePlanningRuleKind(PLANNING_RULE_INVALID, invalid, translate)).toBe(invalid);
    expect(localizePlanningRuleKind(OTHER_KEY, other, translate)).toBe(other);
    expect(localizePlanningRuleKind(PLANNING_RULE, undefined, translate)).toBeUndefined();
  });
});
