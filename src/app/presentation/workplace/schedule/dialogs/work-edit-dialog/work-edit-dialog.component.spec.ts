// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { WorkEditDialogComponent } from './work-edit-dialog.component';
import { DataScheduleService } from 'src/app/infrastructure/api/schedule/data-schedule.service';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { Work } from 'src/app/domain/models/schedule/schedule-class';

describe('WorkEditDialogComponent', () => {
  let component: WorkEditDialogComponent;
  let updateWorkMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    updateWorkMock = vi.fn().mockReturnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [WorkEditDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataScheduleService, useValue: { updateWork: updateWorkMock } },
        {
          provide: WorkScheduleLoaderService,
          useValue: {
            startDate: null,
            endDate: null,
            periodHours: new Map(),
            replaceClientEntriesForDays: vi.fn(),
            updateClientNeededRows: vi.fn(),
          },
        },
        { provide: ScheduleEntryCrudService, useValue: { triggerScheduleRefresh: vi.fn() } },
        {
          provide: NgbModal,
          useValue: {
            open: vi.fn().mockReturnValue({ close: vi.fn(), dismiss: vi.fn() }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(WorkEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('keeps lockLevel and surcharges of a sealed entry unchanged when only the time is edited', () => {
    component.open({
      workId: 'work-1',
      clientId: 'client-1',
      shiftId: 'shift-1',
      currentDate: new Date('2026-08-15'),
      workStartTime: '08:00:00',
      workEndTime: '12:00:00',
      information: null,
      lockLevel: 2,
      surcharges: 15,
    });

    component.onSave();

    expect(updateWorkMock).toHaveBeenCalledTimes(1);
    const savedWork = updateWorkMock.mock.calls[0][0] as Work;
    expect(savedWork.lockLevel).toBe(2);
    expect(savedWork.surcharges).toBe(15);
  });

  it('saves lockLevel 0 for an entry that was not sealed to begin with', () => {
    component.open({
      workId: 'work-2',
      clientId: 'client-1',
      shiftId: 'shift-1',
      currentDate: new Date('2026-08-15'),
      workStartTime: '08:00:00',
      workEndTime: '12:00:00',
      information: null,
      lockLevel: 0,
      surcharges: 0,
    });

    component.onSave();

    const savedWork = updateWorkMock.mock.calls[0][0] as Work;
    expect(savedWork.lockLevel).toBe(0);
    expect(savedWork.surcharges).toBe(0);
  });
});
