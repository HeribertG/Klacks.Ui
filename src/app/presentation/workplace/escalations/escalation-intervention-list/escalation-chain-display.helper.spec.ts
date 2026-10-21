// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IEscalationChainSummary } from 'src/app/domain/interfaces/escalation-chain-summary.interface';
import {
  currentStage,
  nextStage,
  remainingPercent,
  splitDuration,
  urgency,
} from './escalation-chain-display.helper';

const NOW = Date.UTC(2026, 9, 15, 10, 0, 0);
const MINUTE = 60000;

function chain(overrides: Partial<IEscalationChainSummary> = {}): IEscalationChainSummary {
  return {
    id: 'c1',
    purpose: 'AbsenceCoverage',
    workId: null,
    conditionId: null,
    absentClientName: 'Anna',
    shiftStartUtc: null,
    deadlineUtc: new Date(NOW + 60 * MINUTE).toISOString(),
    startedAtUtc: new Date(NOW - 60 * MINUTE).toISOString(),
    groupName: null,
    findingKind: null,
    groupId: null,
    scenarioId: null,
    wakeNotBeforeUtc: null,
    canAcknowledge: false,
    canCancel: false,
    stages: [
      { rank: 1, userId: 'a', userDisplayName: 'A', status: 'Expired', notifiedAtUtc: null, dueAtUtc: null, respondedAtUtc: null },
      { rank: 2, userId: 'b', userDisplayName: 'B', status: 'Notified', notifiedAtUtc: null, dueAtUtc: null, respondedAtUtc: null },
      { rank: 3, userId: 'c', userDisplayName: 'C', status: 'Pending', notifiedAtUtc: null, dueAtUtc: null, respondedAtUtc: null },
    ],
    ...overrides,
  };
}

describe('escalation chain display helper', () => {
  it('reports the remaining share of the reaction time in percent', () => {
    expect(remainingPercent(chain(), NOW)).toBe(50);
  });

  it('has no percentage without a start time', () => {
    expect(remainingPercent(chain({ startedAtUtc: null }), NOW)).toBeNull();
  });

  it('turns critical in the last quarter and calm above half', () => {
    expect(urgency(chain(), NOW - 30 * MINUTE)).toBe('calm');
    expect(urgency(chain(), NOW)).toBe('warning');
    expect(urgency(chain(), NOW + 50 * MINUTE)).toBe('critical');
  });

  it('never reports a negative remaining time', () => {
    expect(remainingPercent(chain(), NOW + 120 * MINUTE)).toBe(0);
  });

  it('splits a duration into days, hours and minutes, rounding minutes up', () => {
    expect(splitDuration((26 * 60 + 5) * MINUTE - 1)).toEqual({ days: 1, hours: 2, minutes: 5 });
  });

  it('finds whose turn it is and who comes next', () => {
    expect(currentStage(chain())?.userId).toBe('b');
    expect(nextStage(chain())?.userId).toBe('c');
  });
});
