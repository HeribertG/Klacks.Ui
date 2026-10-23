// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Read-only report of the Wizard 3 vision critic: patterns a vision model sees in the finished plan, each already
 * checked against the real plan by the backend. Purely informational - the findings never changed the plan.
 * Renders nothing when the critic was skipped (no critic model configured), a short notice when it failed, and a
 * "nothing found" line when it ran without findings.
 * @param critic - Critic review of the run; null or undefined when the run response carries none
 * @param agentDisplayNames - Agent names in the run's row order, used to replace r00, r01, ...
 * @param periodStart - First day of the run period, used to turn day indices into dates
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarDatePipe } from 'src/app/shared/pipes/calendar-date/calendar-date.pipe';
import { PlanCriticResult } from 'src/app/domain/models/holistic-harmonizer/plan-critic-result.interface';
import { PLAN_CRITIC_STATUS } from 'src/app/domain/constants/plan-critic.constants';
import { toPlanCriticFindingViews } from 'src/app/domain/helpers/plan-critic.helper';

@Component({
  selector: 'app-plan-critic-report',
  templateUrl: './plan-critic-report.component.html',
  styleUrls: ['./plan-critic-report.component.scss'],
  standalone: true,
  imports: [TranslateModule, CalendarDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanCriticReportComponent {
  readonly critic = input<PlanCriticResult | null | undefined>(null);
  readonly agentDisplayNames = input<readonly string[]>([]);
  readonly periodStart = input<Date | null>(null);

  readonly isVisible = computed(() => {
    const status = this.critic()?.status;
    return status === PLAN_CRITIC_STATUS.completed || status === PLAN_CRITIC_STATUS.failed;
  });

  readonly isFailed = computed(() => this.critic()?.status === PLAN_CRITIC_STATUS.failed);

  readonly findings = computed(() =>
    toPlanCriticFindingViews(this.critic()?.findings, this.agentDisplayNames(), this.periodStart()),
  );

  readonly discardedCount = computed(() => this.critic()?.discardedFindingCount ?? 0);

  readonly modelId = computed(() => this.critic()?.modelId ?? null);
}
