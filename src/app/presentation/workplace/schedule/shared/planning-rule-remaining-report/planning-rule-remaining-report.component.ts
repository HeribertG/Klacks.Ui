// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Read-only notice for the hard planning-rule violations that remain after a Wizard 2 or stage-3 run, whose rule guard
 * makes no hard rule worse in total: how many remain unrepaired, or, should the count have risen, that the run added
 * violations. Points to the error list, where the findings that existed when the run started are marked.
 * @param remaining - Hard planning-rule findings before and after the run; the notice renders nothing without any left
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PlanningRuleRemaining } from 'src/app/domain/models/schedule/planning-rule-remaining.model';
import { describePlanningRuleRemaining } from 'src/app/domain/helpers/planning-rule-remaining.helper';

const GUARANTEES_NO_WORSENING = true;

@Component({
  selector: 'app-planning-rule-remaining-report',
  templateUrl: './planning-rule-remaining-report.component.html',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningRuleRemainingReportComponent {
  readonly remaining = input<PlanningRuleRemaining | null | undefined>(null);

  readonly notice = computed(() => describePlanningRuleRemaining(this.remaining(), GUARANTEES_NO_WORSENING));
}
