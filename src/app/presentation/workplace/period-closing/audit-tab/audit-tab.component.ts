// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Audit tab: lists seal/unseal events and export runs for the selected date range.
 * Displays two compact tables inside sub-sections; clicking a row opens a detail
 * modal with all fields that are hidden in the row view.
 */

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgbDateStruct, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { ExportLog } from 'src/app/infrastructure/api/period-closing/models/export-log';
import {
  PeriodAuditAction,
  PeriodAuditLog,
} from 'src/app/infrastructure/api/period-closing/models/period-audit-log';
import {
  firstOfMonth,
  lastOfMonth,
  ngbDateStructToIsoDate,
} from 'src/app/shared/helpers/ngb-date.helper';
import { DateToStringShort } from 'src/app/shared/helpers/date.helper';

@Component({
  selector: 'app-audit-tab',
  templateUrl: './audit-tab.component.html',
  styleUrls: ['./audit-tab.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, ExpandableCardComponent, DateInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditTabComponent implements OnInit {
  private api = inject(DataPeriodClosingService);
  private modalService = inject(NgbModal);

  public startDate = signal<NgbDateStruct | null>(firstOfMonth(0));
  public endDate = signal<NgbDateStruct | null>(lastOfMonth(0));
  public auditEntries = signal<PeriodAuditLog[]>([]);
  public exportEntries = signal<ExportLog[]>([]);
  public selectedAudit = signal<PeriodAuditLog | null>(null);
  public selectedExport = signal<ExportLog | null>(null);

  public readonly PeriodAuditAction = PeriodAuditAction;

  private readonly auditModalTemplate = viewChild<TemplateRef<unknown>>('auditDetailModal');
  private readonly exportModalTemplate = viewChild<TemplateRef<unknown>>('exportDetailModal');

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    const startIso = ngbDateStructToIsoDate(this.startDate());
    const endIso = ngbDateStructToIsoDate(this.endDate());
    if (!startIso || !endIso) return;
    this.api.getAuditLog(startIso, endIso).subscribe({
      next: (entries) => this.auditEntries.set(entries),
    });
    this.api.getExportLog(startIso, endIso).subscribe({
      next: (entries) => this.exportEntries.set(entries),
    });
  }

  openAuditDetail(entry: PeriodAuditLog): void {
    const template = this.auditModalTemplate();
    if (!template) return;
    this.selectedAudit.set(entry);
    this.modalService.open(template, { size: 'lg', centered: true });
  }

  openExportDetail(entry: ExportLog): void {
    const template = this.exportModalTemplate();
    if (!template) return;
    this.selectedExport.set(entry);
    this.modalService.open(template, { size: 'lg', centered: true });
  }

  displayUser(name: string | null | undefined, fallback: string): string {
    return name && name.trim().length > 0 ? name : fallback;
  }

  formatRange(start: string, end: string): string {
    if (!start || !end) return '';
    const startTxt = DateToStringShort(start);
    const endTxt = DateToStringShort(end);
    return start === end ? startTxt : `${startTxt} – ${endTxt}`;
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  }
}
