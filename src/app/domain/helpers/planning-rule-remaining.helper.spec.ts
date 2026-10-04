// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  describePlanningRuleRemaining,
  hardPlanningRuleFindingKeys,
  isHardPlanningRuleFinding,
  planningRuleFindingKey,
} from './planning-rule-remaining.helper';
import {
  PLANNING_RULE_REMAINING_ADDED_KEY,
  PLANNING_RULE_REMAINING_COUNTS_KEY,
  PLANNING_RULE_REMAINING_PRE_EXISTING_KEY,
  SCHEDULE_VALIDATION_KEY_PLANNING_RULE,
} from 'src/app/domain/constants/schedule-validation-keys.constants';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';

function entry(overrides: Partial<ScheduleErrorEntry> = {}): ScheduleErrorEntry {
  return {
    type: 'error',
    date: '2026-10-05',
    clientId: 'c1',
    clientName: 'A',
    comment: SCHEDULE_VALIDATION_KEY_PLANNING_RULE,
    commentParams: { ruleId: 'r1', kind: 'X' },
    ...overrides,
  };
}

describe('describePlanningRuleRemaining', () => {
  it('says nothing without remaining hard violations', () => {
    expect(describePlanningRuleRemaining(null, true)).toBeNull();
    expect(describePlanningRuleRemaining(undefined, true)).toBeNull();
    expect(describePlanningRuleRemaining({ hardBefore: 3, hardAfter: 0 }, true)).toBeNull();
  });

  it('calls remaining violations pre-existing when the count did not rise', () => {
    expect(describePlanningRuleRemaining({ hardBefore: 3, hardAfter: 2 }, true)).toEqual({
      key: PLANNING_RULE_REMAINING_PRE_EXISTING_KEY,
      params: { count: 2 },
    });
    expect(describePlanningRuleRemaining({ hardBefore: 2, hardAfter: 2 }, true)?.key).toBe(
      PLANNING_RULE_REMAINING_PRE_EXISTING_KEY,
    );
  });

  it('says the run added violations when the count rose', () => {
    expect(describePlanningRuleRemaining({ hardBefore: 1, hardAfter: 3 }, true)).toEqual({
      key: PLANNING_RULE_REMAINING_ADDED_KEY,
      params: { before: 1, after: 3 },
    });
    expect(describePlanningRuleRemaining({ hardBefore: 1, hardAfter: 3 }, false)?.key).toBe(
      PLANNING_RULE_REMAINING_ADDED_KEY,
    );
  });

  it('only reports the counts for a run without the no-worsening guarantee', () => {
    expect(describePlanningRuleRemaining({ hardBefore: 5, hardAfter: 4 }, false)).toEqual({
      key: PLANNING_RULE_REMAINING_COUNTS_KEY,
      params: { before: 5, after: 4 },
    });
  });
});

describe('planning-rule finding keys', () => {
  it('takes only hard planning-rule findings', () => {
    expect(isHardPlanningRuleFinding(entry())).toBe(true);
    expect(isHardPlanningRuleFinding(entry({ type: 'warning' }))).toBe(false);
    expect(isHardPlanningRuleFinding(entry({ comment: 'schedule.error-list.rest-violation' }))).toBe(false);
  });

  it('also takes hard counter-rule findings, which the run guard evaluates as well', () => {
    expect(isHardPlanningRuleFinding(entry({ comment: 'schedule.error-list.counter-rule' }))).toBe(true);
    expect(isHardPlanningRuleFinding(entry({ comment: 'schedule.error-list.counter-rule', type: 'warning' }))).toBe(false);
  });

  it('keys a finding by client, date, key and rule identity, not by its observed value', () => {
    expect(planningRuleFindingKey(entry())).toBe(`c1|2026-10-05|${SCHEDULE_VALIDATION_KEY_PLANNING_RULE}|r1|||`);
    expect(planningRuleFindingKey(entry({ commentParams: undefined }))).toBe(
      `c1|2026-10-05|${SCHEDULE_VALIDATION_KEY_PLANNING_RULE}||||`,
    );
    const counter = (count: string) =>
      entry({
        comment: 'schedule.error-list.counter-rule',
        commentParams: { event: 'NightShift', period: 'Month', threshold: '5', count },
      });
    expect(planningRuleFindingKey(counter('6'))).toBe(planningRuleFindingKey(counter('7')));
  });

  it('collects the keys of the hard planning-rule findings', () => {
    const keys = hardPlanningRuleFindingKeys([
      entry(),
      entry({ type: 'warning', clientId: 'c2' }),
      entry({ date: '2026-10-06', commentParams: { ruleId: 'r2' } }),
    ]);
    expect(keys.size).toBe(2);
    expect(keys.has(planningRuleFindingKey(entry()))).toBe(true);
    expect(keys.has(planningRuleFindingKey(entry({ date: '2026-10-06', commentParams: { ruleId: 'r2' } })))).toBe(true);
  });
});
