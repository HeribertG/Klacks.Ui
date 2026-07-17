// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { OnCallDialogComponent } from './oncall-dialog.component';
import { DataManagementWorkchangeService } from 'src/app/domain/services/workchange/data-management-workchange.service';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { WorkChangeType, WorkTimeContext } from 'src/app/domain/models/workchange/work-change';

function createWorkChangeServiceMock() {
  return {
    create: vi.fn().mockReturnValue(of({ clientResults: undefined })),
    update: vi.fn().mockReturnValue(of({ clientResults: undefined })),
    get: vi.fn(),
  };
}

const workContext: WorkTimeContext = {
  workStartTime: '18:00',
  workEndTime: '22:00',
  crossesMidnight: false,
};

describe('OnCallDialogComponent', () => {
  let component: OnCallDialogComponent;
  let workChangeServiceMock: ReturnType<typeof createWorkChangeServiceMock>;

  beforeEach(async () => {
    workChangeServiceMock = createWorkChangeServiceMock();

    await TestBed.configureTestingModule({
      imports: [OnCallDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementWorkchangeService, useValue: workChangeServiceMock },
        { provide: WorkScheduleLoaderService, useValue: { periodHours: new Map(), replaceClientEntriesForDays: vi.fn(), updateClientNeededRows: vi.fn() } },
        { provide: ScheduleEntryCrudService, useValue: { triggerScheduleRefresh: vi.fn() } },
        { provide: NgbModal, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(OnCallDialogComponent);
    component = fixture.componentInstance;

    component.workId = 'work-1';
    component.clientId = 'client-1';
    component.currentDate = new Date('2026-04-15');
    component.workContext = workContext;
  });

  function setRange(start: OwnTime, end: OwnTime): void {
    component.startTime = start;
    component.endTime = end;
    component.onTimeChange();
  }

  it('defaults to OnCallPresence and sends the real start/end time on save', () => {
    setRange(OwnTime.forTime('18', '00'), OwnTime.forTime('22', '00'));

    expect(component.onCallType()).toBe(WorkChangeType.OnCallPresence);
    expect(component.isValid()).toBe(true);

    component.onSave();

    expect(workChangeServiceMock.create).toHaveBeenCalledTimes(1);
    const request = workChangeServiceMock.create.mock.calls[0][0];
    expect(request.type).toBe(WorkChangeType.OnCallPresence);
    expect(request.type).toBe(10);
    expect(request.startTime).toBe('18:00:00');
    expect(request.endTime).toBe('22:00:00');
    expect(request.startTime).not.toBe('00:00');
    expect(request.changeTime).toBe(4);
  });

  it('maps standby selection to OnCallStandby (11)', () => {
    component.onTypeChange(WorkChangeType.OnCallStandby);
    setRange(OwnTime.forTime('18', '00'), OwnTime.forTime('22', '00'));

    component.onSave();

    const request = workChangeServiceMock.create.mock.calls[0][0];
    expect(request.type).toBe(WorkChangeType.OnCallStandby);
    expect(request.type).toBe(11);
  });

  it('computes raw hours across midnight', () => {
    setRange(OwnTime.forTime('18', '00'), OwnTime.forTime('08', '00'));

    component.onSave();

    const request = workChangeServiceMock.create.mock.calls[0][0];
    expect(request.changeTime).toBe(14);
  });

  it('does not save an invalid zero-length range', () => {
    setRange(OwnTime.forTime('08', '00'), OwnTime.forTime('08', '00'));

    expect(component.isValid()).toBe(false);

    component.onSave();

    expect(workChangeServiceMock.create).not.toHaveBeenCalled();
  });
});
