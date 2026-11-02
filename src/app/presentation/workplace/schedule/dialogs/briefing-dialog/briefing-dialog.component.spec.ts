// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { BriefingDialogComponent } from './briefing-dialog.component';
import { DataManagementWorkchangeService } from 'src/app/domain/services/workchange/data-management-workchange.service';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { WorkChangeType } from 'src/app/domain/models/workchange/work-change-type.enum';

describe('BriefingDialogComponent billable flag', () => {
  let component: BriefingDialogComponent;
  let get: ReturnType<typeof vi.fn>;

  const stored = (toInvoice: boolean) => ({
    workId: 'work-1',
    work: { clientId: 'client-1', startTime: '08:00:00', endTime: '16:00:00' },
    startTime: '00:00:00',
    endTime: '00:00:00',
    type: WorkChangeType.Briefing,
    changeTime: 0.25,
    description: 'stored',
    toInvoice,
  });

  const formModel = () => (component as unknown as { formModel: () => { toInvoice: boolean } }).formModel();

  beforeEach(async () => {
    get = vi.fn();

    await TestBed.configureTestingModule({
      imports: [BriefingDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementWorkchangeService, useValue: { get } },
        { provide: WorkScheduleLoaderService, useValue: {} },
        { provide: ScheduleEntryCrudService, useValue: {} },
        { provide: NgbModal, useValue: { open: vi.fn().mockReturnValue({ close: vi.fn(), dismiss: vi.fn() }) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(BriefingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts a new briefing as billable', () => {
    component.open('work-1', 'client-1', new Date(2026, 10, 2), '08:00:00', '16:00:00');

    expect(formModel().toInvoice).toBe(true);
  });

  it('keeps a stored billable flag when a briefing is edited', () => {
    get.mockReturnValue(of(stored(true)));

    component.openEdit('wc-1', new Date(2026, 10, 2));

    expect(formModel().toInvoice).toBe(true);
  });

  it('keeps a stored unticked flag when a briefing is edited', () => {
    get.mockReturnValue(of(stored(false)));

    component.openEdit('wc-1', new Date(2026, 10, 2));

    expect(formModel().toInvoice).toBe(false);
  });
});
