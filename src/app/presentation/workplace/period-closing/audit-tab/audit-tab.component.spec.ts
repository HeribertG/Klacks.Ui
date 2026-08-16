// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { AuditTabComponent } from './audit-tab.component';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { PeriodAuditAction, PeriodAuditLog } from 'src/app/infrastructure/api/period-closing/models/period-audit-log';

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

describe('AuditTabComponent', () => {
  let fixture: ComponentFixture<AuditTabComponent>;
  let component: AuditTabComponent;
  let api: {
    getAuditLog: ReturnType<typeof vi.fn>;
    getExportLog: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      getAuditLog: vi.fn().mockReturnValue(of([])),
      getExportLog: vi.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      imports: [AuditTabComponent, TranslateModule.forRoot()],
      providers: [{ provide: DataPeriodClosingService, useValue: api }],
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
});
