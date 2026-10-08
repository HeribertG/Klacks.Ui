// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { AuditTabComponent } from './audit-tab.component';
import { AUTONOMOUS_ACTOR_LABEL_KEY, AUTONOMOUS_ACTOR_NAME } from './audit-actor.constants';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { ExportLog } from 'src/app/infrastructure/api/period-closing/models/export-log';
import { PeriodAuditAction, PeriodAuditLog } from 'src/app/infrastructure/api/period-closing/models/period-audit-log';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

function auditEntry(action: PeriodAuditAction, id: string): PeriodAuditLog {
  return {
    id,
    action,
    startDate: '2026-08-01',
    endDate: '2026-08-01',
    groupId: null,
    groupName: null,
    reason: null,
    affectedCount: 1,
    performedAt: '2026-08-01T08:00:00Z',
    performedBy: 'user-1',
    performedByName: 'Test User',
  };
}

function exportEntry(overrides: Partial<ExportLog> = {}): ExportLog {
  return {
    id: 'e1',
    format: 'datev-lug-bewegungsdaten',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    groupId: null,
    groupName: null,
    language: 'de',
    currencyCode: 'EUR',
    fileName: 'payroll-export_2026-08-01.csv',
    fileSize: 100,
    recordCount: 12,
    exportedAt: '2026-09-01T08:00:00Z',
    exportedBy: 'user-1',
    exportedByName: 'Test User',
    skippedEntryCount: 0,
    absenceMappingInvalid: false,
    isSupplementary: false,
    personCount: 4,
    hasArtifact: true,
    ...overrides,
  };
}

describe('AuditTabComponent', () => {
  let fixture: ComponentFixture<AuditTabComponent>;
  let component: AuditTabComponent;
  let api: {
    getAuditLog: ReturnType<typeof vi.fn>;
    getExportLog: ReturnType<typeof vi.fn>;
    downloadStoredPayrollExport: ReturnType<typeof vi.fn>;
  };
  let toast: { showError: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = {
      getAuditLog: vi.fn().mockReturnValue(of([])),
      getExportLog: vi.fn().mockReturnValue(of([])),
      downloadStoredPayrollExport: vi.fn(),
    };
    toast = { showError: vi.fn() };
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:stored');
    window.URL.revokeObjectURL = vi.fn();

    TestBed.configureTestingModule({
      imports: [AuditTabComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataPeriodClosingService, useValue: api },
        { provide: ToastShowService, useValue: toast },
      ],
    });

    fixture = TestBed.createComponent(AuditTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function actionBadge(index: number): HTMLElement {
    const cell = fixture.nativeElement.querySelector(`#audit-log-cell-action-${index}`);
    return cell.querySelector('.badge') as HTMLElement;
  }

  it('renders a seal entry with the seal badge', () => {
    component.auditEntries.set([auditEntry(PeriodAuditAction.Seal, 'a1')]);
    fixture.detectChanges();

    const badge = actionBadge(0);
    expect(badge.classList.contains('badge-seal')).toBe(true);
    expect(badge.classList.contains('badge-unseal')).toBe(false);
  });

  it('does not render a day approval as an unseal event', () => {
    component.auditEntries.set([auditEntry(PeriodAuditAction.ApproveDay, 'a2')]);
    fixture.detectChanges();

    const badge = actionBadge(0);
    expect(badge.classList.contains('badge-approve-day')).toBe(true);
    expect(badge.classList.contains('badge-unseal')).toBe(false);
    expect(badge.classList.contains('badge-seal')).toBe(false);
  });

  it('renders work and break confirmations with their own badges, not unseal', () => {
    component.auditEntries.set([
      auditEntry(PeriodAuditAction.ConfirmWork, 'a3'),
      auditEntry(PeriodAuditAction.ConfirmBreak, 'a4'),
    ]);
    fixture.detectChanges();

    const workBadge = actionBadge(0);
    const breakBadge = actionBadge(1);
    expect(workBadge.classList.contains('badge-confirm-work')).toBe(true);
    expect(workBadge.classList.contains('badge-unseal')).toBe(false);
    expect(breakBadge.classList.contains('badge-confirm-break')).toBe(true);
    expect(breakBadge.classList.contains('badge-unseal')).toBe(false);
  });

  it('renders an unrecognised action value as unknown instead of disguising it as unseal', () => {
    component.auditEntries.set([auditEntry(99 as PeriodAuditAction, 'a5')]);
    fixture.detectChanges();

    const badge = actionBadge(0);
    expect(badge.classList.contains('badge-unknown')).toBe(true);
    expect(badge.classList.contains('badge-unseal')).toBe(false);
  });

  it('shows the autonomous actor through its translation instead of the stored English marker', () => {
    expect(component.displayUser(AUTONOMOUS_ACTOR_NAME, 'admin-id')).toBe(AUTONOMOUS_ACTOR_LABEL_KEY);
  });

  it('keeps every other actor name and falls back to the id when the name is empty', () => {
    expect(component.displayUser('Ada Lovelace', 'admin-id')).toBe('Ada Lovelace');
    expect(component.displayUser('', 'admin-id')).toBe('admin-id');
  });

  describe('payroll export runs', () => {
    it('shows the person count and the supplementary badge', () => {
      component.exportEntries.set([exportEntry({ isSupplementary: true, personCount: 4 })]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#export-log-cell-persons-0').textContent.trim()).toBe('4');
      expect(fixture.nativeElement.querySelector('#export-log-cell-supplementary-0')).not.toBeNull();
    });

    it('shows no supplementary badge for a first export', () => {
      component.exportEntries.set([exportEntry()]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#export-log-cell-supplementary-0')).toBeNull();
    });

    it('offers the re-download only while the artifact exists', () => {
      component.exportEntries.set([exportEntry(), exportEntry({ id: 'e2', hasArtifact: false })]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#export-log-download-0')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('#export-log-download-1')).toBeNull();
    });

    it('downloads the stored run under the name the server sends', () => {
      api.downloadStoredPayrollExport.mockReturnValue(
        of(new HttpResponse<Blob>({
          body: new Blob(['x']),
          headers: new HttpHeaders({ 'content-disposition': 'attachment; filename="stored.csv"' }),
        })),
      );
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
      component.exportEntries.set([exportEntry()]);
      fixture.detectChanges();

      (fixture.nativeElement.querySelector('#export-log-download-0') as HTMLButtonElement).click();

      expect(api.downloadStoredPayrollExport).toHaveBeenCalledWith('e1');
      expect(click).toHaveBeenCalled();
      expect(component.downloadingId()).toBeNull();
      click.mockRestore();
    });

    it('reports a failed re-download and releases the button', () => {
      api.downloadStoredPayrollExport.mockReturnValue(throwError(() => new Error('gone')));

      component.downloadExport(exportEntry());

      expect(toast.showError).toHaveBeenCalledWith('gone');
      expect(component.downloadingId()).toBeNull();
    });
  });
});
