// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared read-only notice for the planning-rule warnings a wizard run returns (Wizard 2, stage 3, AutoWizard):
 * approved hard rules the run skipped because they are invalid. Shows the translated text with the readable rule
 * kind, the rule id only as tooltip, like the live error panel.
 * @param warnings - Planning-rule warnings of the run; the notice renders nothing when empty
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocalizedParamsPipe } from 'src/app/shared/pipes/localized-params/localized-params.pipe';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import {
  localizePlanningRuleKind,
  planningRuleTooltip,
} from 'src/app/domain/helpers/planning-rule-entry.helper';

@Component({
  selector: 'app-planning-rule-warning-report',
  templateUrl: './planning-rule-warning-report.component.html',
  standalone: true,
  imports: [TranslateModule, LocalizedParamsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningRuleWarningReportComponent {
  private readonly translate = inject(TranslateService);

  readonly warnings = input<ScheduleErrorEntry[] | null | undefined>([]);

  readonly rows = computed<ScheduleErrorEntry[]>(() =>
    (this.warnings() ?? []).map((warning) => ({
      ...warning,
      commentParams: localizePlanningRuleKind(warning.comment, warning.commentParams, (key) =>
        this.translate.instant(key),
      ),
      tooltip: planningRuleTooltip(warning.comment, warning.commentParams),
    })),
  );
}
