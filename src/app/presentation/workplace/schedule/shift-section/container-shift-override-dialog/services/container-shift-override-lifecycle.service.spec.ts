// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { IContainerTemplate } from 'src/app/domain/models/container/container-template-class';
import { ContainerTemplateRouteService } from 'src/app/presentation/workplace/shift/container-template/services/container-template-route.service';
import { DataAbsenceService } from 'src/app/infrastructure/api/absence/data-absence.service';
import { DataContainerShiftOverrideService } from 'src/app/infrastructure/api/container/data-container-shift-override.service';
import { DataContainerTemplateService } from 'src/app/infrastructure/api/container/data-container-template.service';
import { ContainerShiftOverrideLifecycleService } from './container-shift-override-lifecycle.service';

const CONTAINER_ID = 'container-1';
const HTTP_NOT_FOUND = 404;
const SUNDAY = 0;
const MONDAY = 1;
const WEDNESDAY = 3;

const createTemplate = (
  weekday: number,
  isHoliday: boolean,
  isWeekdayAndHoliday: boolean,
  fromTime: string,
): IContainerTemplate => ({
  containerId: CONTAINER_ID,
  weekday,
  fromTime,
  untilTime: '20:00:00',
  isHoliday,
  isWeekdayAndHoliday,
  containerTemplateItems: [],
});

describe('ContainerShiftOverrideLifecycleService template fallback on holidays', () => {
  let templates: IContainerTemplate[];
  let service: ContainerShiftOverrideLifecycleService;

  const open = (weekday: string, isHoliday: boolean): string | null => {
    service.initialize({ containerId: CONTAINER_ID, date: '2026-12-25', weekday, isHoliday }).subscribe();
    return service.containerStartTime;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ContainerShiftOverrideLifecycleService,
        {
          provide: DataContainerShiftOverrideService,
          useValue: {
            getOverride: () => throwError(() => new HttpErrorResponse({ status: HTTP_NOT_FOUND })),
          },
        },
        {
          provide: DataContainerTemplateService,
          useValue: { getTemplates: () => of(templates), getAvailableTasks: () => of([]) },
        },
        { provide: ContainerTemplateRouteService, useValue: {} },
        { provide: DataAbsenceService, useValue: {} },
      ],
    });
    service = TestBed.inject(ContainerShiftOverrideLifecycleService);
  });

  it('uses the FT holiday template on a holiday whatever its weekday', () => {
    templates = [
      createTemplate(WEDNESDAY, false, false, '07:00:00'),
      createTemplate(MONDAY, true, false, '09:00:00'),
    ];

    expect(open('friday', true)).toBe('09:00:00');
  });

  it('uses the +FT holiday template of the weekday the holiday falls on', () => {
    templates = [
      createTemplate(MONDAY, true, true, '09:00:00'),
      createTemplate(WEDNESDAY, true, true, '10:00:00'),
    ];

    expect(open('wednesday', true)).toBe('10:00:00');
  });

  it('uses no template when a +FT holiday falls on an unticked weekday', () => {
    templates = [
      createTemplate(MONDAY, false, false, '07:00:00'),
      createTemplate(MONDAY, true, true, '09:00:00'),
    ];

    expect(open('sunday', true)).toBeNull();
  });

  it('uses no template on a holiday for a container without holiday option', () => {
    templates = [createTemplate(SUNDAY, false, false, '07:00:00')];

    expect(open('sunday', true)).toBeNull();
  });

  it('keeps using the normal template of the weekday on a normal day', () => {
    templates = [
      createTemplate(MONDAY, true, false, '09:00:00'),
      createTemplate(MONDAY, false, false, '07:00:00'),
    ];

    expect(open('monday', false)).toBe('07:00:00');
  });
});
