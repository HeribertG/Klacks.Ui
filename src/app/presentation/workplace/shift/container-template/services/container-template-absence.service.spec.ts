// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests for inserting an absence after a container template item.
 * @param shiftOpsService - Stub that records the start time chosen for the inserted absence
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IAbsence } from 'src/app/domain/models/absence/absence-class';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { ContainerTemplateAbsenceService } from './container-template-absence.service';
import { ContainerTemplateShiftOperationsService } from './container-template-shift-operations.service';

describe('ContainerTemplateAbsenceService.insertAbsenceAtPosition', () => {
  let service: ContainerTemplateAbsenceService;
  const convertAbsence = vi.fn();
  const arrangeAndSetItems = vi.fn();

  const previousItem = (timeRange: [string | null, string | null]): IContainerTemplateItem =>
    ({
      shiftId: 'shift-1',
      shift: { isTimeRange: false } as IShift,
      startItem: '08:00:00',
      endItem: '16:00:00',
      timeRangeStartItem: timeRange[0],
      timeRangeEndItem: timeRange[1],
    }) as IContainerTemplateItem;

  const insertAfter = (item: IContainerTemplateItem): void => {
    service.insertAbsenceAtPosition(
      { id: 'absence-1' } as IAbsence,
      [item],
      1,
      OwnTime.forTime('06', '00'),
      OwnTime.forTime('22', '00'),
      null,
      false,
    );
  };

  beforeEach(() => {
    convertAbsence.mockReset();
    arrangeAndSetItems.mockReset();
    convertAbsence.mockReturnValue({} as IContainerTemplateItem);

    TestBed.configureTestingModule({
      providers: [
        ContainerTemplateAbsenceService,
        {
          provide: ContainerTemplateShiftOperationsService,
          useValue: {
            convertAbsenceToContainerTemplateItem: convertAbsence,
            arrangeAndSetItems,
          },
        },
        { provide: ContainerTemplateShiftService, useValue: {} },
        { provide: NgbModal, useValue: {} },
        { provide: TranslateService, useValue: {} },
      ],
    });
    service = TestBed.inject(ContainerTemplateAbsenceService);
  });

  it('should start the absence at the fixed end of a fixed-time shift despite a stored 00:00 time range', () => {
    insertAfter(previousItem(['00:00:00', '00:00:00']));

    expect(convertAbsence.mock.calls[0][1]).toBe('16:00:00');
  });

  it('should start the absence at the fixed end of a fixed-time shift without a time range', () => {
    insertAfter(previousItem([null, null]));

    expect(convertAbsence.mock.calls[0][1]).toBe('16:00:00');
  });
});
