// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ErpImportFileRowComponent } from './erp-import-file-row.component';
import { LocaleService } from 'src/app/application/services/locale.service';
import { IErpImportFile } from 'src/app/domain/models/settings/erp-import-file';
import { ErpImportFileStatus } from 'src/app/domain/enums/erp-import-file-status.enum';
import { ErpImportChannel } from 'src/app/domain/enums/erp-import-channel.enum';
import { ERP_IMPORT_FILE_FAILURE_REASONS } from 'src/app/domain/constants/erp-import-file.constants';
import { setCompanyTimeZone } from 'src/app/domain/helpers/calendar-date.helper';
import { ErpImportFilesTab } from '../erp-import-files-tab';
import { APP_PORT_BINDINGS } from 'src/app/app.port-bindings';

const LANGUAGE = 'en';

const TEXTS: Record<string, string> = {
  'settings.erp-drop-points.files.status.received': 'waiting',
  'settings.erp-drop-points.files.status.importing': 'importing',
  'settings.erp-drop-points.files.status.importing-progress': 'importing {{processed}}/{{total}}',
  'settings.erp-drop-points.files.status.completed': 'done',
  'settings.erp-drop-points.files.status.completed-with-warnings': 'done with warnings',
  'settings.erp-drop-points.files.channel.ui-upload': 'upload',
  'settings.erp-drop-points.files.channel.token-push': 'push',
  'settings.erp-drop-points.files.channel.inbox-folder': 'folder',
  'settings.erp-drop-points.files.summary.new': '{{count}} new',
  'settings.erp-drop-points.files.summary.updated': '{{count}} updated',
  'settings.erp-drop-points.files.summary.unchanged': '{{count}} unchanged',
  'settings.erp-drop-points.files.summary.superseded': '{{count}} superseded',
  'settings.erp-drop-points.files.summary.rejected': '{{count}} rejected',
  'settings.erp-drop-points.files.rejected-orders.without-reference': '+{{count}} without reference',
  'settings.erp-drop-points.files.rejected-orders.more': '+{{count}} more',
  'settings.erp-drop-points.files.duplicate-hint': 'identical file delivered on {{date}}',
  'settings.erp-drop-points.files.failure.file-changed': 'changed after receipt',
  'settings.erp-drop-points.files.failure.import-aborted': 'aborted: {{detail}}',
};

const importFile = (status: ErpImportFileStatus, overrides: Partial<IErpImportFile> = {}): IErpImportFile => ({
  id: 'file-1',
  fileName: 'orders.xml',
  sizeBytes: 2048,
  status,
  channel: ErpImportChannel.UiUpload,
  uploadedBy: 'Anna Admin',
  receivedAt: '2026-10-19T08:00:00Z',
  startedAt: null,
  finishedAt: null,
  processedOrders: 0,
  totalOrders: null,
  newCount: 0,
  updatedCount: 0,
  unchangedCount: 0,
  supersededCount: 0,
  rejectedCount: 0,
  failureReason: null,
  duplicateOfReceivedAt: null,
  rejectedOrders: [],
  ...overrides,
});

describe('ErpImportFileRowComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ErpImportFileRowComponent, TranslateModule.forRoot()],
      providers: [...APP_PORT_BINDINGS, { provide: LocaleService, useValue: { getLocale: () => 'en-US' } }],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(LANGUAGE, TEXTS);
    translate.use(LANGUAGE);
    setCompanyTimeZone('UTC');
  });

  afterEach(() => {
    setCompanyTimeZone(null);
  });

  const render = (file: IErpImportFile, tab: ErpImportFilesTab) => {
    const fixture = TestBed.createComponent(ErpImportFileRowComponent);
    fixture.componentRef.setInput('file', file);
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('tab', tab);
    fixture.detectChanges();
    return fixture;
  };

  const text = (element: HTMLElement, selector: string): string =>
    (element.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();

  it('shows the import progress of an importing file in the inbox', () => {
    // Arrange / Act
    const fixture = render(importFile(ErpImportFileStatus.Importing, { processedOrders: 350, totalOrders: 620 }), 'inbox');

    // Assert
    expect(text(fixture.nativeElement, '#erp-drop-points-files-status-0')).toBe('importing 350/620');
  });

  it('shows "importing" without numbers while the total is not parsed yet', () => {
    // Arrange / Act
    const fixture = render(importFile(ErpImportFileStatus.Importing), 'inbox');

    // Assert
    expect(text(fixture.nativeElement, '#erp-drop-points-files-status-0')).toBe('importing');
  });

  it('shows a received file as waiting', () => {
    // Arrange / Act
    const fixture = render(importFile(ErpImportFileStatus.Received), 'inbox');

    // Assert
    expect(text(fixture.nativeElement, '#erp-drop-points-files-status-0')).toBe('waiting');
  });

  it('shows the channel and the uploader', () => {
    // Arrange / Act
    const fixture = render(importFile(ErpImportFileStatus.Received, { channel: ErpImportChannel.TokenPush, uploadedBy: 'ERP token' }), 'inbox');

    // Assert
    expect(text(fixture.nativeElement, '.col-source')).toBe('push · ERP token');
  });

  it('shows only the channel for an inbox-folder file without uploader', () => {
    // Arrange / Act
    const fixture = render(importFile(ErpImportFileStatus.Received, { channel: ErpImportChannel.InboxFolder, uploadedBy: null }), 'inbox');

    // Assert
    expect(text(fixture.nativeElement, '.col-source')).toBe('folder');
  });

  it('shows the per-file summary and a success icon for a completed file', () => {
    // Arrange / Act
    const fixture = render(
      importFile(ErpImportFileStatus.Completed, { totalOrders: 6, processedOrders: 6, newCount: 3, updatedCount: 1, unchangedCount: 2 }),
      'processed',
    );

    // Assert
    const element = fixture.nativeElement as HTMLElement;
    expect(text(element, '#erp-drop-points-files-result-0')).toContain('3 new · 1 updated · 2 unchanged');
    expect(text(element, '#erp-drop-points-files-result-0')).not.toContain('superseded');
    expect(text(element, '#erp-drop-points-files-result-0')).not.toContain('rejected');
    expect(element.querySelector('.status-icon.warning-icon')).toBeNull();
    expect(element.querySelector('.status-icon')?.getAttribute('aria-label')).toBe('done');
  });

  it('keeps the only non-zero counter of a re-delivered file', () => {
    // Arrange / Act
    const fixture = render(importFile(ErpImportFileStatus.Completed, { totalOrders: 620, processedOrders: 620, unchangedCount: 620 }), 'processed');

    // Assert
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.summary-part').length).toBe(1);
    expect(text(element, '.summary-part')).toBe('620 unchanged');
  });

  it('shows "0 new" for a file without any order instead of an empty summary', () => {
    // Arrange / Act
    const fixture = render(importFile(ErpImportFileStatus.Completed, { totalOrders: 0 }), 'processed');

    // Assert
    expect(text(fixture.nativeElement, '.summary-part')).toBe('0 new');
  });

  it('shows no summary for a migrated legacy row instead of "0 new"', () => {
    // Arrange / Act
    const fixture = render(importFile(ErpImportFileStatus.Completed, { totalOrders: null }), 'processed');

    // Assert
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.summary-part').length).toBe(0);
    expect(text(element, '#erp-drop-points-files-result-0')).not.toContain('new');
  });

  it('marks a completed-with-warnings file with the warning icon and expands its rejected orders', () => {
    // Arrange
    const fixture = render(
      importFile(ErpImportFileStatus.CompletedWithWarnings, {
        totalOrders: 4,
        processedOrders: 4,
        newCount: 1,
        rejectedCount: 3,
        rejectedOrders: [
          { externalOrderReference: 'ORD-1', reason: 'no weekday' },
          { externalOrderReference: 'ORD-2', reason: 'UntilDate before FromDate' },
        ],
      }),
      'processed',
    );
    const element = fixture.nativeElement as HTMLElement;
    const expandButton = element.querySelector('#erp-drop-points-files-expand-btn-0') as HTMLButtonElement;
    const rejectedRow = (): HTMLElement => element.querySelector('#erp-drop-points-files-rejected-0')?.closest('[role="row"]') as HTMLElement;
    expect(element.querySelector('.status-icon.warning-icon')).not.toBeNull();
    expect(expandButton.getAttribute('aria-controls')).toBe('erp-drop-points-files-rejected-0');
    expect(rejectedRow().hidden).toBe(true);

    // Act
    expandButton.click();
    fixture.detectChanges();

    // Assert
    expect(rejectedRow().hidden).toBe(false);
    const rows = element.querySelectorAll('#erp-drop-points-files-rejected-0 .rejected-order');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('ORD-1');
    expect(rows[0].textContent).toContain('no weekday');
    expect(text(element, '.rejected-without-reference')).toBe('+1 without reference');
    expect(element.querySelector('#erp-drop-points-files-expand-btn-0')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('lists at most 50 rejected orders and summarises the rest as "+N more"', () => {
    // Arrange
    const rejectedOrders = Array.from({ length: 53 }, (_, i) => ({ externalOrderReference: `ORD-${i}`, reason: 'invalid' }));
    const fixture = render(
      importFile(ErpImportFileStatus.CompletedWithWarnings, { totalOrders: 53, processedOrders: 53, rejectedCount: 53, rejectedOrders }),
      'processed',
    );
    const element = fixture.nativeElement as HTMLElement;

    // Act
    (element.querySelector('#erp-drop-points-files-expand-btn-0') as HTMLButtonElement).click();
    fixture.detectChanges();

    // Assert
    expect(element.querySelectorAll('.rejected-order .rejected-reference').length).toBe(50);
    expect(text(element, '#erp-drop-points-files-rejected-more-0')).toBe('+3 more');
    expect(element.querySelector('.rejected-without-reference')).toBeNull();
  });

  it.each([
    ['processed', 6],
    ['failed', 7],
  ] as const)('exposes the %s row as a table row with %i cells', (tab, cellCount) => {
    // Arrange / Act
    const fixture = render(
      importFile(tab === 'failed' ? ErpImportFileStatus.Failed : ErpImportFileStatus.Completed, {
        totalOrders: 1,
        duplicateOfReceivedAt: '2026-10-18T07:30:00Z',
      }),
      tab,
    );

    // Assert
    const element = fixture.nativeElement as HTMLElement;
    const row = element.querySelector('#erp-drop-points-files-row-0') as HTMLElement;
    expect(row.getAttribute('role')).toBe('row');
    expect(row.querySelectorAll(':scope > [role="cell"]').length).toBe(cellCount);
    const hintCell = element.querySelector('#erp-drop-points-files-duplicate-hint-0 [role="cell"]');
    expect(element.querySelector('#erp-drop-points-files-duplicate-hint-0')?.getAttribute('role')).toBe('row');
    expect(hintCell?.getAttribute('aria-colspan')).toBe(String(cellCount));
  });

  it('offers no expansion for a completed file without rejected orders', () => {
    // Arrange / Act
    const fixture = render(importFile(ErpImportFileStatus.Completed, { totalOrders: 1 }), 'processed');

    // Assert
    expect(fixture.nativeElement.querySelector('#erp-drop-points-files-expand-btn-0')).toBeNull();
  });

  it('shows the duplicate hint with the earlier delivery time without blocking anything', () => {
    // Arrange / Act
    const fixture = render(importFile(ErpImportFileStatus.Received, { duplicateOfReceivedAt: '2026-10-18T07:30:00Z' }), 'inbox');

    // Assert
    const hint = text(fixture.nativeElement, '#erp-drop-points-files-duplicate-hint-0');
    expect(hint).toContain('identical file delivered on');
    expect(hint).toContain('07:30');
  });

  it('shows no duplicate hint for a first delivery', () => {
    // Arrange / Act
    const fixture = render(importFile(ErpImportFileStatus.Received), 'inbox');

    // Assert
    expect(fixture.nativeElement.querySelector('#erp-drop-points-files-duplicate-hint-0')).toBeNull();
  });

  it('translates a fixed failure reason and keeps a parser message raw', () => {
    // Arrange / Act
    const fixed = render(importFile(ErpImportFileStatus.Failed, { failureReason: ERP_IMPORT_FILE_FAILURE_REASONS.FileChangedAfterReceipt }), 'failed');
    const raw = render(importFile(ErpImportFileStatus.Failed, { failureReason: 'Root element is missing.' }), 'failed');
    const aborted = render(
      importFile(ErpImportFileStatus.Interrupted, { failureReason: `${ERP_IMPORT_FILE_FAILURE_REASONS.ImportAbortedPrefix}disk full` }),
      'failed',
    );

    // Assert
    expect(text(fixed.nativeElement, '#erp-drop-points-files-reason-0')).toBe('changed after receipt');
    expect(text(raw.nativeElement, '#erp-drop-points-files-reason-0')).toBe('Root element is missing.');
    expect(text(aborted.nativeElement, '#erp-drop-points-files-reason-0')).toBe('aborted: disk full');
  });

  it('emits the file for retry and delete in the failed tab', () => {
    // Arrange
    const file = importFile(ErpImportFileStatus.Failed, { failureReason: 'x' });
    const fixture = render(file, 'failed');
    const retried: IErpImportFile[] = [];
    const deleted: IErpImportFile[] = [];
    fixture.componentInstance.retryRequested.subscribe((value) => retried.push(value));
    fixture.componentInstance.deleteRequested.subscribe((value) => deleted.push(value));
    const element = fixture.nativeElement as HTMLElement;

    // Act
    (element.querySelector('#erp-drop-points-files-retry-btn-0') as HTMLButtonElement).click();
    (element.querySelector('#erp-drop-points-files-delete-btn-0') as HTMLButtonElement).click();

    // Assert
    expect(retried).toEqual([file]);
    expect(deleted).toEqual([file]);
  });

  it('renders no retry or delete action outside the failed tab', () => {
    // Arrange / Act
    const fixture = render(importFile(ErpImportFileStatus.Completed, { totalOrders: 1 }), 'processed');

    // Assert
    expect(fixture.nativeElement.querySelector('#erp-drop-points-files-retry-btn-0')).toBeNull();
    expect(fixture.nativeElement.querySelector('#erp-drop-points-files-delete-btn-0')).toBeNull();
  });
});
