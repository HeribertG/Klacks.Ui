// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ShiftDragData } from './shift-drag-data.interface';
import { ShiftToScheduleDragDropService } from './shift-to-schedule-drag-drop.service';

const DRAG_DATA: ShiftDragData = {
  shiftId: 'shift-1',
  shiftName: 'Early',
  abbreviation: 'EMP',
  startShift: '07:00',
  endShift: '15:00',
  workTime: 8,
  sourceColumn: 3,
};

const TARGET_DATE = new Date(Date.UTC(2026, 10, 2));

describe('ShiftToScheduleDragDropService', () => {
  let service: ShiftToScheduleDragDropService;
  let toast: { showInfo: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    toast = { showInfo: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ToastShowService, useValue: toast },
        { provide: TranslateService, useValue: { instant: (key: string) => `T:${key}` } },
      ],
    });
    service = TestBed.inject(ShiftToScheduleDragDropService);
    service.startDrag(new MouseEvent('mousedown', { clientX: 10, clientY: 20 }), DRAG_DATA);
  });

  it('returns the drop and stays silent on a valid empty cell', () => {
    service.setOverScheduleSection(true);
    service.setDropTarget(4, 'client-1', TARGET_DATE, true);

    const result = service.endDrag();

    expect(result).toEqual(expect.objectContaining({ shiftId: 'shift-1', targetClientId: 'client-1', targetRow: 4 }));
    expect(toast.showInfo).not.toHaveBeenCalled();
  });

  it('books nothing and tells the user why when the cell is occupied, e.g. by a FREE command', () => {
    service.setOverScheduleSection(true);
    service.setDropTarget(4, 'client-1', TARGET_DATE, false);

    const result = service.endDrag();

    expect(result).toBeNull();
    expect(toast.showInfo).toHaveBeenCalledTimes(1);
    expect(toast.showInfo).toHaveBeenCalledWith('T:schedule.shiftDrop.rejected');
    expect(service.isDragging()).toBe(false);
  });

  it('stays a silent cancel when released outside the schedule', () => {
    service.setOverScheduleSection(true);
    service.setDropTarget(4, 'client-1', TARGET_DATE, false);
    service.setOverScheduleSection(false);

    const result = service.endDrag();

    expect(result).toBeNull();
    expect(toast.showInfo).not.toHaveBeenCalled();
  });

  it('stays silent when released over the schedule before any cell was targeted', () => {
    service.setOverScheduleSection(true);

    expect(service.endDrag()).toBeNull();
    expect(toast.showInfo).not.toHaveBeenCalled();
  });
});
