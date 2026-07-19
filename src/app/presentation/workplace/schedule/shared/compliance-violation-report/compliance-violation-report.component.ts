// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Shared read-only report listing compliance rule violations produced by any of the schedule
 * wizards (direct apply, apply-as-scenario, or a scenario's end-state compliance diff).
 * @param entries - The violations to display; the report renders nothing when empty
 * @param blockingCount - Optional count of entries that are enforced as Block and will prevent
 * accepting the scenario until resolved or overridden; renders an extra hint line when > 0
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';

@Component({
  selector: 'app-compliance-violation-report',
  templateUrl: './compliance-violation-report.component.html',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplianceViolationReportComponent {
  readonly entries = input.required<ScheduleErrorEntry[]>();
  readonly blockingCount = input<number>(0);

  isError(entry: ScheduleErrorEntry): boolean {
    return entry.type === 'error';
  }

  rowClass(entry: ScheduleErrorEntry): string {
    return this.isError(entry) ? 'table-danger' : 'table-warning';
  }
}
