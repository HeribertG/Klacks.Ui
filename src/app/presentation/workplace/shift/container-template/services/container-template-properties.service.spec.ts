// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests for opening the container template item properties dialog.
 * @param ngbModal - Stub whose modal result never resolves, so only the prefilled properties are observed
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TemplateRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { TimeRangeService } from 'src/app/presentation/shared/time-ruler/services/time-range.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { ContainerTemplatePropertiesService } from './container-template-properties.service';
import { ContainerTemplateItemManipulationService } from './container-template-item-manipulation.service';

describe('ContainerTemplatePropertiesService.openPropertiesDialog', () => {
  let service: ContainerTemplatePropertiesService;

  const itemOf = (
    isTimeRange: boolean,
    timeRangeStart: string | null,
  ): IContainerTemplateItem =>
    ({
      shiftId: 'shift-1',
      shift: { isTimeRange } as IShift,
      startItem: '08:00:00',
      endItem: '16:00:00',
      briefingTime: '00:00',
      debriefingTime: '00:00',
      travelTimeBefore: '00:00',
      travelTimeAfter: '00:00',
      timeRangeStartItem: timeRangeStart,
      timeRangeEndItem: null,
    }) as IContainerTemplateItem;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ContainerTemplatePropertiesService,
        TimeRangeService,
        {
          provide: NgbModal,
          useValue: { open: () => ({ result: new Promise(() => undefined) }) },
        },
        { provide: ContainerTemplateShiftService, useValue: {} },
        { provide: ContainerTemplateItemManipulationService, useValue: {} },
        { provide: DataManagementContainerService, useValue: {} },
        { provide: WorkplaceStateService, useValue: {} },
      ],
    });
    service = TestBed.inject(ContainerTemplatePropertiesService);
  });

  const open = (item: IContainerTemplateItem): void => {
    service.contextMenuTargetItem = item;
    service.openPropertiesDialog({} as TemplateRef<unknown>);
  };

  it('should not prefill a stored 00:00 time range for a fixed-time shift', () => {
    open(itemOf(false, '00:00:00'));

    expect(service.editedProperties?.timeRangeStartItem).toBe('08:00:00');
  });

  it('should prefill the time range of a time-range shift', () => {
    open(itemOf(true, '09:30:00'));

    expect(service.editedProperties?.timeRangeStartItem).toBe('09:30:00');
  });

  it('should fall back to the fixed start when a time-range shift has no time range', () => {
    open(itemOf(true, null));

    expect(service.editedProperties?.timeRangeStartItem).toBe('08:00:00');
  });
});
