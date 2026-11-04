// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ContainerSplitDialogComponent } from './container-split-dialog.component';
import { DataContainerWorkChildrenService } from 'src/app/infrastructure/api/schedule/data-container-work-children.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { DataScheduleService } from 'src/app/infrastructure/api/schedule/data-schedule.service';
import { ContainerLockService } from 'src/app/domain/services/container/container-lock.service';
import { DataContainerLockService } from 'src/app/infrastructure/api/container/data-container-lock.service';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { ContainerWorkChildren } from 'src/app/domain/models/container/container-work-children.interface';
import { SubBreakResource } from 'src/app/domain/models/container/sub-break-resource.interface';
import { SubWorkResource } from 'src/app/domain/models/container/sub-work-resource.interface';
import { WorkChangeResource } from 'src/app/domain/models/container/work-change-resource.interface';

const PARENT_CLIENT_ID = 'client-parent';
const REPLACEMENT_CLIENT_ID = 'client-replacement';
const CONTAINER_DATE = new Date('2026-08-15');
const SPLIT_RESPONSE = { firstPart: null, secondPart: null };

const makeSubWork = (id: string, startTime: string, endTime: string): SubWorkResource => ({
  id,
  shiftId: 'task-shift',
  clientId: 'customer',
  currentDate: '2026-08-15',
  startTime,
  endTime,
  workTime: 0,
  parentWorkId: 'work-parent',
  information: null,
  transportMode: null,
  startBase: null,
  endBase: null,
});

const makeSubBreak = (id: string, startTime: string, endTime: string): SubBreakResource => ({
  id,
  absenceId: 'absence',
  clientId: PARENT_CLIENT_ID,
  currentDate: '2026-08-15',
  startTime,
  endTime,
  workTime: 0,
  parentWorkId: 'work-parent',
});

const makeWorkChange = (id: string, workId: string): WorkChangeResource => ({
  id,
  workId,
  changeTime: 0.25,
  surcharges: 0,
  startTime: '00:00:00',
  endTime: '00:00:00',
  type: 0,
  replaceClientId: null,
  description: '',
  toInvoice: false,
});

const splittableChildren = (): ContainerWorkChildren => ({
  subWorks: [makeSubWork('task-early', '08:00:00', '11:00:00'), makeSubWork('task-late', '13:00:00', '15:00:00')],
  subBreaks: [makeSubBreak('break-late', '15:00:00', '15:30:00')],
  subWorkChanges: [makeWorkChange('change-early', 'task-early'), makeWorkChange('change-late', 'task-late')],
});

describe('ContainerSplitDialogComponent', () => {
  let component: ContainerSplitDialogComponent;
  let refreshClientScheduleForDays: ReturnType<typeof vi.fn>;
  let refreshAllLoadedPeriodHours: ReturnType<typeof vi.fn>;
  let saveChildren: ReturnType<typeof vi.fn>;
  let splitContainer: ReturnType<typeof vi.fn>;
  let addWork: ReturnType<typeof vi.fn>;
  let loadChildren: ReturnType<typeof vi.fn>;
  let modalRef: {
    close: ReturnType<typeof vi.fn>;
    dismiss: ReturnType<typeof vi.fn>;
    result: Promise<unknown>;
  };

  const openDialog = () =>
    component.open({
      workId: 'work-parent',
      clientId: PARENT_CLIENT_ID,
      containerStart: '08:00',
      containerEnd: '16:00',
      currentDate: CONTAINER_DATE,
    });

  beforeEach(async () => {
    loadChildren = vi.fn().mockReturnValue(of(splittableChildren()));
    refreshClientScheduleForDays = vi.fn().mockResolvedValue(undefined);
    refreshAllLoadedPeriodHours = vi.fn();
    saveChildren = vi.fn();
    splitContainer = vi.fn().mockReturnValue(of(SPLIT_RESPONSE));
    addWork = vi.fn();
    modalRef = { close: vi.fn(), dismiss: vi.fn(), result: new Promise(() => undefined) };

    await TestBed.configureTestingModule({
      imports: [ContainerSplitDialogComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataContainerWorkChildrenService,
          useValue: { loadChildren, saveChildren, splitContainer },
        },
        {
          provide: DataClientService,
          useValue: { getClientsForReplacement: vi.fn().mockReturnValue(of([])) },
        },
        {
          provide: DataScheduleService,
          useValue: { addWork },
        },
        {
          provide: ContainerLockService,
          useValue: {
            acquire: vi.fn().mockReturnValue(of({ acquired: true })),
            release: vi.fn(),
            currentLock: () => null,
          },
        },
        { provide: ScheduleEntryCrudService, useValue: { refreshClientScheduleForDays } },
        { provide: WorkScheduleLoaderService, useValue: { refreshAllLoadedPeriodHours } },
        { provide: NgbModal, useValue: { open: vi.fn().mockReturnValue(modalRef) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ContainerSplitDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    openDialog();
    component.onSplitTimeOwnChanged(OwnTime.forTime('12', '00'));
  });

  it('offers the gap between the two tasks as the only split point', () => {
    expect(component.splitGaps().map((g) => [g.start, g.end])).toEqual([['11:00', '13:00']]);
  });

  it('sets the split time to the end of the earlier task when a split point is chosen', () => {
    component.onSplitTimeOwnChanged(OwnTime.forTime('09', '00'));

    component.selectSplitGap(component.splitGaps()[0]);

    expect(component.splitTime()).toBe('11:00');
    expect(component.isSplitTimeValid()).toBe(true);
  });

  it('blocks saving when the split time cuts through a task', () => {
    component.selectClient(REPLACEMENT_CLIENT_ID, 'Replacement');
    component.onSplitTimeOwnChanged(OwnTime.forTime('14', '00'));

    expect(component.isSplitTimeValid()).toBe(false);
    expect(component.canSave()).toBe(false);
    component.onSave();
    expect(splitContainer).not.toHaveBeenCalled();
  });

  it('offers no split point and blocks saving when the container holds a single task', () => {
    loadChildren.mockReturnValue(
      of({ subWorks: [makeSubWork('only', '09:00:00', '15:00:00')], subBreaks: [], subWorkChanges: [] }),
    );
    openDialog();
    component.onSplitTimeOwnChanged(OwnTime.forTime('12', '00'));
    component.selectClient(REPLACEMENT_CLIENT_ID, 'Replacement');

    expect(component.hasSplitPoints()).toBe(false);
    expect(component.canSave()).toBe(false);
  });

  it('splits with exactly one request to the split endpoint and writes nothing else', () => {
    component.selectClient(REPLACEMENT_CLIENT_ID, 'Replacement');

    component.onSave();

    expect(splitContainer).toHaveBeenCalledTimes(1);
    expect(splitContainer).toHaveBeenCalledWith('work-parent', { splitTime: '12:00:00', targetClientId: REPLACEMENT_CLIENT_ID });
    expect(saveChildren).not.toHaveBeenCalled();
    expect(addWork).not.toHaveBeenCalled();
  });

  it('refreshes the schedule of the parent and the replacement client after a successful split', () => {
    component.selectClient(REPLACEMENT_CLIENT_ID, 'Replacement');

    component.onSave();

    expect(modalRef.close).toHaveBeenCalledTimes(1);
    expect(refreshClientScheduleForDays).toHaveBeenCalledTimes(2);
    expect(refreshClientScheduleForDays).toHaveBeenCalledWith(PARENT_CLIENT_ID, CONTAINER_DATE);
    expect(refreshClientScheduleForDays).toHaveBeenCalledWith(REPLACEMENT_CLIENT_ID, CONTAINER_DATE);
    expect(refreshAllLoadedPeriodHours).toHaveBeenCalledTimes(1);
  });

  it('refreshes the schedule of the client only once when the copy stays with the same client', () => {
    component.selectClient(PARENT_CLIENT_ID, 'Parent');

    component.onSave();

    expect(refreshClientScheduleForDays).toHaveBeenCalledTimes(1);
    expect(refreshClientScheduleForDays).toHaveBeenCalledWith(PARENT_CLIENT_ID, CONTAINER_DATE);
  });

  it('keeps the dialog open and sends no other request when the server refuses the split', () => {
    component.selectClient(REPLACEMENT_CLIENT_ID, 'Replacement');
    splitContainer.mockReturnValue(throwError(() => new Error('refused')));

    component.onSave();

    expect(modalRef.close).not.toHaveBeenCalled();
    expect(component.isSaving()).toBe(false);
    expect(saveChildren).not.toHaveBeenCalled();
    expect(addWork).not.toHaveBeenCalled();
    expect(refreshClientScheduleForDays).not.toHaveBeenCalled();
  });

  it('logs the error when refreshing a client schedule fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failure = new Error('refresh failed');
    refreshClientScheduleForDays.mockRejectedValue(failure);
    component.selectClient(REPLACEMENT_CLIENT_ID, 'Replacement');

    component.onSave();

    await vi.waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        'Error refreshing schedule after container split:',
        failure,
      ),
    );
    expect(modalRef.close).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});

describe('ContainerSplitDialogComponent lock release', () => {
  const PARENT_WORK_ID = 'work-parent';

  let component: ContainerSplitDialogComponent;
  let lockService: ContainerLockService;
  let heldLocks: Set<string>;
  let splitContainer: ReturnType<typeof vi.fn>;
  let rejectModalResult: (reason?: unknown) => void;
  let modalRef: {
    close: ReturnType<typeof vi.fn>;
    dismiss: ReturnType<typeof vi.fn>;
    result: Promise<unknown>;
  };

  beforeEach(async () => {
    heldLocks = new Set<string>();
    splitContainer = vi.fn().mockReturnValue(of(SPLIT_RESPONSE));
    modalRef = {
      close: vi.fn(),
      dismiss: vi.fn(),
      result: new Promise((_, reject) => {
        rejectModalResult = reject;
      }),
    };
    modalRef.result.catch(() => undefined);

    await TestBed.configureTestingModule({
      imports: [ContainerSplitDialogComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataContainerLockService,
          useValue: {
            acquire: (_type: string, resourceId: string) => {
              heldLocks.add(resourceId);
              return of({ id: resourceId, resourceId, acquired: true });
            },
            release: (lockId: string) => {
              heldLocks.delete(lockId);
              return of(true);
            },
            heartbeat: () => of(null),
          },
        },
        {
          provide: DataContainerWorkChildrenService,
          useValue: { loadChildren: vi.fn().mockReturnValue(of(splittableChildren())), splitContainer },
        },
        { provide: DataClientService, useValue: { getClientsForReplacement: vi.fn().mockReturnValue(of([])) } },
        { provide: ScheduleEntryCrudService, useValue: { refreshClientScheduleForDays: vi.fn().mockResolvedValue(undefined) } },
        { provide: WorkScheduleLoaderService, useValue: { refreshAllLoadedPeriodHours: vi.fn() } },
        { provide: NgbModal, useValue: { open: vi.fn().mockReturnValue(modalRef) } },
      ],
    }).compileComponents();

    lockService = TestBed.inject(ContainerLockService);
    const fixture = TestBed.createComponent(ContainerSplitDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.open({
      workId: PARENT_WORK_ID,
      clientId: PARENT_CLIENT_ID,
      containerStart: '08:00',
      containerEnd: '16:00',
      currentDate: CONTAINER_DATE,
    });
    component.onSplitTimeOwnChanged(OwnTime.forTime('12', '00'));
    component.selectClient(REPLACEMENT_CLIENT_ID, 'Replacement');
  });

  afterEach(() => {
    lockService.release();
  });

  it('holds only the parent lock while the dialog is open', () => {
    expect([...heldLocks]).toEqual([PARENT_WORK_ID]);
  });

  it('releases the parent lock after a successful split', () => {
    component.onSave();

    expect(modalRef.close).toHaveBeenCalledTimes(1);
    expect([...heldLocks]).toEqual([]);
  });

  it('keeps the parent lock while the dialog stays open after a refused split', () => {
    splitContainer.mockReturnValue(throwError(() => new Error('refused')));

    component.onSave();

    expect([...heldLocks]).toEqual([PARENT_WORK_ID]);
  });

  it('releases the parent lock when the dialog is cancelled', () => {
    component.close();

    expect([...heldLocks]).toEqual([]);
  });

  it('releases the parent lock when the modal is dismissed another way', async () => {
    rejectModalResult();
    await Promise.resolve();
    await Promise.resolve();

    expect([...heldLocks]).toEqual([]);
  });
});
