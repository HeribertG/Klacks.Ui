// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { ContainerTemplateSlotCalculationService } from 'src/app/domain/services/container/container-template-slot-calculation.service';
import { DataAbsenceService } from 'src/app/infrastructure/api/absence/data-absence.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { ContainerTemplateTabService } from './container-template-tab.service';

const createContainer = (overrides: Partial<IShift>): IShift =>
  ({
    startShift: '08:00:00',
    endShift: '16:00:00',
    cuttingAfterMidnight: false,
    isMonday: true,
    isTuesday: false,
    isWednesday: false,
    isThursday: false,
    isFriday: false,
    isSaturday: false,
    isSunday: false,
    isHoliday: false,
    isWeekdayAndHoliday: false,
    ...overrides,
  }) as IShift;

describe('ContainerTemplateTabService holiday filter', () => {
  let service: ContainerTemplateTabService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ContainerTemplateTabService,
        { provide: DataAbsenceService, useValue: {} },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: TableSortingService, useValue: {} },
      ],
    });
    service = TestBed.inject(ContainerTemplateTabService);
  });

  const rowsFor = (container: IShift, weekday: string, isHoliday: boolean) => {
    const grid = new ContainerTemplateSlotCalculationService().calculateTemplateGrid(container);
    return service
      .getFilteredRowsForSelectedWeekday(weekday, isHoliday, grid)
      .map((row) => [row[0].weekday, row[0].isHoliday, row[0].isWeekdayAndHoliday]);
  };

  it('shows only the normal template of a +FT weekday when the holiday variant is off', () => {
    expect(rowsFor(createContainer({ isWeekdayAndHoliday: true }), 'monday', false)).toEqual([
      [1, false, false],
    ]);
  });

  it('shows only the holiday template of a +FT weekday when the holiday variant is on', () => {
    expect(rowsFor(createContainer({ isWeekdayAndHoliday: true }), 'monday', true)).toEqual([
      [1, true, true],
    ]);
  });

  it('shows the single FT holiday template under its fixed weekday', () => {
    expect(rowsFor(createContainer({ isMonday: false, isWednesday: true, isHoliday: true }), 'monday', true)).toEqual([
      [1, true, false],
    ]);
  });

  it('shows no holiday tab for a container without holiday option', () => {
    expect(rowsFor(createContainer({}), 'monday', true)).toEqual([]);
  });
});
