// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Collapsible card listing PeriodIssue entries grouped by date.
 * @param issues - Aggregated issue list; grouping and severity counts are derived
 * @param periodLabel - Human-readable period label shown in the PDF header
 * @param unstaffedShiftCount - Period-wide total of unfilled shift slots (sum of needed - engaged)
 * @param unstaffedShiftTruncated - True when the shift query hit the page limit and count is a lower bound
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PeriodIssue } from 'src/app/infrastructure/api/period-closing/models/period-issue';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';
import { PeriodIssuesPdfExportService } from './period-issues-pdf-export.service';

interface IssueGroup {
  date: string;
  items: PeriodIssue[];
}

@Component({
  selector: 'app-period-issues-card',
  templateUrl: './period-issues-card.component.html',
  styleUrls: ['./period-issues-card.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, ExpandableCardComponent, PdfIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodIssuesCardComponent {
  private pdfExportService = inject(PeriodIssuesPdfExportService);

  public issues = input.required<PeriodIssue[]>();
  public periodLabel = input<string>('');
  public unstaffedShiftCount = input<number>(0);
  public unstaffedShiftTruncated = input<boolean>(false);

  public byDate = computed<IssueGroup[]>(() => {
    const map = new Map<string, PeriodIssue[]>();
    for (const issue of this.issues()) {
      const list = map.get(issue.date) ?? [];
      list.push(issue);
      map.set(issue.date, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, items }));
  });

  public errorCount = computed(() => this.issues().filter((i) => i.severity === 'error').length);
  public warningCount = computed(() => this.issues().filter((i) => i.severity === 'warning').length);
  public infoCount = computed(() => this.issues().filter((i) => i.severity === 'info').length);
  public hasIssues = computed(() => this.issues().length > 0 || this.unstaffedShiftCount() > 0);
  public hasUnstaffed = computed(() => this.unstaffedShiftCount() > 0);
  public canExport = computed(() => this.issues().length > 0);

  onPdfExport(): void {
    this.pdfExportService.exportToPdf(
      this.issues(),
      this.periodLabel(),
      this.unstaffedShiftCount(),
      this.unstaffedShiftTruncated(),
    );
  }
}
