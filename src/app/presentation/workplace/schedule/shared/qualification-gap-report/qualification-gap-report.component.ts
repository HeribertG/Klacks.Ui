// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Shared read-only report listing qualification gaps produced by any of the three schedule wizards.
 * UnfillableSlot rows (Planner) have no agent; AssignedUnqualified rows (Harmonizers) name the agent.
 * @param gaps - The qualification gap details to display; the report renders nothing when empty
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import {
  QualificationGapDetail,
  QualificationGapReason,
  QualificationGapSeverity,
} from 'src/app/domain/models/schedule/qualification-gap.model';

@Component({
  selector: 'app-qualification-gap-report',
  templateUrl: './qualification-gap-report.component.html',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualificationGapReportComponent {
  private readonly translate = inject(TranslateService);

  readonly gaps = input.required<QualificationGapDetail[]>();

  readonly hasAgentColumn = computed(() => this.gaps().some((g) => !!g.agentName));

  isError(gap: QualificationGapDetail): boolean {
    return gap.severity === QualificationGapSeverity.Error;
  }

  rowClass(gap: QualificationGapDetail): string {
    return this.isError(gap) ? 'table-danger' : 'table-warning';
  }

  qualificationLabel(gap: QualificationGapDetail): string {
    const name = getLocalizedValue(gap.qualificationName, this.translate.currentLang);
    return gap.qualificationEmoji ? `${gap.qualificationEmoji} ${name}` : name;
  }

  reasonKey(reason: QualificationGapReason): string {
    switch (reason) {
      case QualificationGapReason.Expired:
        return 'schedule.qualificationGaps.reason.expired';
      case QualificationGapReason.InsufficientLevel:
        return 'schedule.qualificationGaps.reason.insufficientLevel';
      default:
        return 'schedule.qualificationGaps.reason.missing';
    }
  }
}
