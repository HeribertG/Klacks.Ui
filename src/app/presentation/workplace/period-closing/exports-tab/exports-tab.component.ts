// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Exports tab: pick format, date range, language, currency and optional group,
 * then download the generated file. After a successful download the server persists
 * an ExportLog entry automatically (Phase 5 backend integration).
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';

type ExportFormat = 'csv' | 'json' | 'xml' | 'datev' | 'zugferd' | 'bmd';

@Component({
  selector: 'app-exports-tab',
  templateUrl: './exports-tab.component.html',
  styleUrls: ['./exports-tab.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportsTabComponent {
  private api = inject(DataPeriodClosingService);
  private toastShowService = inject(ToastShowService);
  private translate = inject(TranslateService);

  public startDate = signal<string>(this.firstOfCurrentMonth());
  public endDate = signal<string>(this.lastOfCurrentMonth());
  public format = signal<ExportFormat>('csv');
  public language = signal<string>('de');
  public currency = signal<string>('EUR');
  public groupId = signal<string | null>(null);
  public busy = signal<boolean>(false);

  public readonly formats: { key: ExportFormat; labelKey: string }[] = [
    { key: 'csv',     labelKey: 'periodClosing.format.csv' },
    { key: 'json',    labelKey: 'periodClosing.format.json' },
    { key: 'xml',     labelKey: 'periodClosing.format.xml' },
    { key: 'datev',   labelKey: 'periodClosing.format.datev' },
    { key: 'zugferd', labelKey: 'periodClosing.format.zugferd' },
    { key: 'bmd',     labelKey: 'periodClosing.format.bmd' },
  ];

  onExport(): void {
    this.busy.set(true);
    this.api.downloadOrderExport({
      startDate: this.startDate(),
      endDate: this.endDate(),
      format: this.format(),
      language: this.language(),
      currencyCode: this.currency(),
      groupId: this.groupId(),
    }).subscribe({
      next: (res) => {
        const blob = res.body;
        if (!blob) {
          this.toastShowService.showError('Empty response body');
          this.busy.set(false);
          return;
        }
        const fileName = this.extractFileName(res.headers.get('content-disposition'))
          ?? `order-export_${this.startDate()}_${this.endDate()}.${this.format()}`;
        this.triggerDownload(blob, fileName);
        const msg = this.translate.instant('periodClosing.success.exported', { file: fileName });
        const header = this.translate.instant('periodClosing.action.export');
        this.toastShowService.showSuccess(msg, header);
        this.busy.set(false);
      },
      error: (err) => {
        const msg: string = err?.error?.message ?? err?.message ?? 'Error';
        this.toastShowService.showError(msg);
        this.busy.set(false);
      },
    });
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private extractFileName(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
    return match?.[1] ?? null;
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
