// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Presentation rules for the Wizard 3 vision critic. The backend sends findings anonymized (rows r00, r01, ... and
 * zero-based day indices); here they are mapped back to agent names and calendar dates for the planner. A row label
 * without a known name stays as it is. Severity values the client does not know are shown as Medium.
 * @param findings - Verified critic findings of one run
 * @param agentDisplayNames - Agent names in the run's row order (index = row)
 * @param periodStart - First day of the run period; without it the cited dates are left out
 */

import { addDays } from 'src/app/domain/helpers/date.helper';
import { PlanCriticFinding } from 'src/app/domain/models/holistic-harmonizer/plan-critic-finding.interface';
import { PlanCriticFindingView } from 'src/app/domain/models/holistic-harmonizer/plan-critic-finding-view.interface';
import { PlanCriticAffectedAgent } from 'src/app/domain/models/holistic-harmonizer/plan-critic-affected-agent.interface';
import { PLAN_CRITIC_SEVERITY, PLAN_CRITIC_SEVERITY_KEYS } from 'src/app/domain/constants/plan-critic.constants';

const ROW_LABEL_PATTERN = /\br(\d{2,})\b/g;
const ROW_LABEL_PREFIX = 'r';
const ROW_LABEL_DIGITS = 2;
const PATTERN_SEPARATOR = /_+/g;

export function planCriticRowLabel(row: number): string {
  return `${ROW_LABEL_PREFIX}${row.toString().padStart(ROW_LABEL_DIGITS, '0')}`;
}

export function resolvePlanCriticRowLabels(text: string, agentDisplayNames: readonly string[]): string {
  return text.replace(ROW_LABEL_PATTERN, (label, digits: string) => agentDisplayNames[Number(digits)] ?? label);
}

export function toPlanCriticFindingViews(
  findings: readonly PlanCriticFinding[] | null | undefined,
  agentDisplayNames: readonly string[],
  periodStart: Date | null,
): PlanCriticFindingView[] {
  return (findings ?? []).map((finding) => {
    const severity = PLAN_CRITIC_SEVERITY_KEYS[finding.severity] ? finding.severity : PLAN_CRITIC_SEVERITY.medium;
    return {
      severity,
      severityKey: PLAN_CRITIC_SEVERITY_KEYS[severity],
      pattern: finding.pattern.replace(PATTERN_SEPARATOR, ' ').trim(),
      description: resolvePlanCriticRowLabels(finding.description, agentDisplayNames),
      agents: groupByAgent(finding, agentDisplayNames, periodStart),
    };
  });
}

function groupByAgent(
  finding: PlanCriticFinding,
  agentDisplayNames: readonly string[],
  periodStart: Date | null,
): PlanCriticAffectedAgent[] {
  const daysByRow = new Map<number, Set<number>>();
  for (const cell of finding.cells) {
    const days = daysByRow.get(cell.row) ?? new Set<number>();
    days.add(cell.day);
    daysByRow.set(cell.row, days);
  }

  return [...daysByRow.entries()]
    .sort(([a], [b]) => a - b)
    .map(([row, days]) => ({
      name: agentDisplayNames[row] ?? planCriticRowLabel(row),
      dates: periodStart ? [...days].sort((a, b) => a - b).map((day) => addDays(periodStart, day)) : [],
    }));
}
