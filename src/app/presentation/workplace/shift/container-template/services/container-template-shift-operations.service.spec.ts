// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests for the time range violation check of container template items.
 * @param hasTimeRangeViolation - Must flag items planned outside the time range of their shift
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { TimeRangeService } from 'src/app/presentation/shared/time-ruler/services/time-range.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { ContainerTemplateShiftOperationsService } from './container-template-shift-operations.service';
import { ShiftArrangementService } from './shift-arrangement.service';
import { ContainerTemplateItemManipulationService } from './container-template-item-manipulation.service';
import { ContainerTemplatePdfExportService } from './container-template-pdf-export.service';
import { ContainerTemplateRouteService } from './container-template-route.service';

describe('ContainerTemplateShiftOperationsService.hasTimeRangeViolation', () => {
  let service: ContainerTemplateShiftOperationsService;

  const itemOf = (
    isTimeRange: boolean,
    start: string | null,
    end: string | null,
  ): IContainerTemplateItem =>
    ({
      shiftId: 'shift-1',
      shift: {
        isTimeRange,
        startShift: '08:00:00',
        endShift: '16:00:00',
      } as IShift,
      timeRangeStartItem: start,
      timeRangeEndItem: end,
    }) as IContainerTemplateItem;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ContainerTemplateShiftOperationsService,
        TimeRangeService,
        { provide: ShiftArrangementService, useValue: {} },
        { provide: ContainerTemplateItemManipulationService, useValue: {} },
        { provide: ContainerTemplateShiftService, useValue: {} },
        { provide: DataManagementContainerService, useValue: {} },
        { provide: TranslateService, useValue: {} },
        { provide: ToastShowService, useValue: {} },
        { provide: ContainerTemplatePdfExportService, useValue: {} },
        { provide: ContainerTemplateRouteService, useValue: {} },
        { provide: WorkplaceStateService, useValue: {} },
      ],
    });
    service = TestBed.inject(ContainerTemplateShiftOperationsService);
  });

  it('should be false when the planned span lies inside the shift range', () => {
    expect(service.hasTimeRangeViolation(itemOf(true, '09:00:00', '12:00:00'))).toBe(false);
  });

  it('should be true when the planned start is before the shift range', () => {
    expect(service.hasTimeRangeViolation(itemOf(true, '07:00:00', '12:00:00'))).toBe(true);
  });

  it('should be true when the planned end is after the shift range', () => {
    expect(service.hasTimeRangeViolation(itemOf(true, '09:00:00', '17:00:00'))).toBe(true);
  });

  it('should be false when the planned end is missing', () => {
    expect(service.hasTimeRangeViolation(itemOf(true, '07:00:00', null))).toBe(false);
    expect(service.hasTimeRangeViolation(itemOf(true, '07:00:00', ''))).toBe(false);
  });

  it('should be false when the planned start is missing', () => {
    expect(service.hasTimeRangeViolation(itemOf(true, null, '17:00:00'))).toBe(false);
  });

  it('should be false for a fixed-time shift', () => {
    expect(service.hasTimeRangeViolation(itemOf(false, '00:00:00', '00:00:00'))).toBe(false);
  });
});
