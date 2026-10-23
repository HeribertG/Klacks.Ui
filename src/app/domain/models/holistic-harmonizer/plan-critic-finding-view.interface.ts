// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PlanCriticAffectedAgent } from './plan-critic-affected-agent.interface';

/**
 * A critic finding prepared for display: row labels in the description replaced by agent names, cells grouped by
 * agent with real dates.
 * @param severity - Low, Medium or High (unknown values are shown as Medium)
 * @param severityKey - Translation key of the severity label
 * @param pattern - Readable form of the critic's pattern label ("night then early")
 * @param description - Critic description with r00, r01, ... replaced by agent names
 * @param agents - Affected agents with the dates of their cited cells, in row order
 */
export interface PlanCriticFindingView {
  severity: string;
  severityKey: string;
  pattern: string;
  description: string;
  agents: PlanCriticAffectedAgent[];
}
