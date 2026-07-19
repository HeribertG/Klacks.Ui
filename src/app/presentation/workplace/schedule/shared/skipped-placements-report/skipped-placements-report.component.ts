// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Shared read-only report listing wizard placements that were skipped because they would have
 * violated a Block-mode compliance rule. The backend's SkippedPlacementDto carries only a bare
 * translation key without interpolation params, so reasons are shown as short category labels
 * instead of the full interpolated sentence used elsewhere for the same key.
 * @param entries - The skipped placements to display; the report renders nothing when empty
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { SkippedPlacementEntry } from 'src/app/domain/models/schedule/skipped-placement.model';

const REASON_SHORT_LABEL_KEYS: Record<string, string> = {
  'schedule.error-list.rest-violation': 'schedule.compliance.reasonShort.restViolation',
  'schedule.error-list.overtime': 'schedule.compliance.reasonShort.overtime',
  'schedule.error-list.consecutive-days': 'schedule.compliance.reasonShort.consecutiveDays',
  'schedule.error-list.weekly-overtime': 'schedule.compliance.reasonShort.weeklyOvertime',
  'schedule.error-list.min-rest-days': 'schedule.compliance.reasonShort.minRestDays',
  'schedule.error-list.collision': 'schedule.compliance.reasonShort.collision',
  'schedule.error-list.period-cap': 'schedule.compliance.reasonShort.periodCap',
  'schedule.error-list.period-cap-overtime': 'schedule.compliance.reasonShort.periodCapOvertime',
  'schedule.error-list.period-cap-overtime-window': 'schedule.compliance.reasonShort.periodCapOvertimeWindow',
  'schedule.error-list.rolling-average': 'schedule.compliance.reasonShort.rollingAverage',
  'schedule.error-list.rest-day-rotation': 'schedule.compliance.reasonShort.restDayRotation',
  'schedule.error-list.counter-rule': 'schedule.compliance.reasonShort.counterRule',
  'schedule.error-list.compensatory-rest-due': 'schedule.compliance.reasonShort.compensatoryRestDue',
  'schedule.error-list.compensatory-rest-overdue': 'schedule.compliance.reasonShort.compensatoryRestOverdue',
  'schedule.error-list.restricted-time-window': 'schedule.compliance.reasonShort.restrictedTimeWindow',
};

@Component({
  selector: 'app-skipped-placements-report',
  templateUrl: './skipped-placements-report.component.html',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkippedPlacementsReportComponent {
  readonly entries = input.required<SkippedPlacementEntry[]>();

  reasonLabelKey(entry: SkippedPlacementEntry): string {
    return REASON_SHORT_LABEL_KEYS[entry.reasonKey] ?? 'schedule.compliance.reasonShort.other';
  }
}
