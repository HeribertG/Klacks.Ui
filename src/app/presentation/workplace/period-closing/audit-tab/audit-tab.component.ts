// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Audit tab: lists seal/unseal events and export runs for the selected date range.
 * Two tables displayed side-by-side (or stacked on small viewports).
 */

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { ExportLog } from 'src/app/infrastructure/api/period-closing/models/export-log';
import { PeriodAuditAction, PeriodAuditLog } from 'src/app/infrastructure/api/period-closing/models/period-audit-log';

@Component({
  selector: 'app-audit-tab',
  templateUrl: './audit-tab.component.html',
  styleUrls: ['./audit-tab.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditTabComponent implements OnInit {
  private api = inject(DataPeriodClosingService);

  public startDate = signal<string>(this.firstOfCurrentMonth());
  public endDate = signal<string>(this.lastOfCurrentMonth());
  public auditEntries = signal<PeriodAuditLog[]>([]);
  public exportEntries = signal<ExportLog[]>([]);

  public readonly PeriodAuditAction = PeriodAuditAction;

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api.getAuditLog(this.startDate(), this.endDate()).subscribe({
      next: (entries) => this.auditEntries.set(entries),
    });
    this.api.getExportLog(this.startDate(), this.endDate()).subscribe({
      next: (entries) => this.exportEntries.set(entries),
    });
  }

  private firstOfCurrentMonth(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  }

  private lastOfCurrentMonth(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  }
}
