// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Remembers which hard planning-rule findings the error list showed when a wizard run started (Wizard 2, stage 3,
 * AutoWizard). Once that run delivers a new result, those findings are marked "pre-existing - please check" in the
 * error list: they existed before the run and the run did not repair them. Findings that appear later (added by the
 * AutoWizard or by manual edits) are not in the snapshot and stay unmarked. The marking only starts with a result that
 * differs from the one the signal held at capture time, so a start that fails or is refused never activates it.
 * @param entries - Error-list entries at the moment the run starts
 * @param runResult - Result signal of the run; the marking applies only while it holds the run's new result
 */

import { Injectable, Signal, computed, signal } from '@angular/core';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import {
  hardPlanningRuleFindingKeys,
  isHardPlanningRuleFinding,
  planningRuleFindingKey,
} from 'src/app/domain/helpers/planning-rule-remaining.helper';

interface RunSnapshot {
  keys: ReadonlySet<string>;
  runResult: Signal<unknown>;
  resultAtCapture: unknown;
}

const NO_KEYS: ReadonlySet<string> = new Set<string>();

@Injectable({ providedIn: 'root' })
export class PlanningRulePreExistingService {
  private readonly snapshot = signal<RunSnapshot | null>(null);

  readonly preExistingKeys = computed<ReadonlySet<string>>(() => {
    const current = this.snapshot();
    if (!current) {
      return NO_KEYS;
    }
    const result = current.runResult();
    if (result == null || result === current.resultAtCapture) {
      return NO_KEYS;
    }
    return current.keys;
  });

  captureBeforeRun(entries: readonly ScheduleErrorEntry[], runResult: Signal<unknown>): void {
    this.snapshot.set({ keys: hardPlanningRuleFindingKeys(entries), runResult, resultAtCapture: runResult() });
  }

  isPreExisting(entry: ScheduleErrorEntry): boolean {
    return isHardPlanningRuleFinding(entry) && this.preExistingKeys().has(planningRuleFindingKey(entry));
  }
}
