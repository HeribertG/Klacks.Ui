// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IShift } from '../../models/shift/shift-class';
import { FT_HOLIDAY_TEMPLATE_WEEKDAY } from '../../constants/container-template-holiday.constants';
import { ContainerTemplateSlotCalculationService } from './container-template-slot-calculation.service';

const MONDAY = 1;
const WEDNESDAY = 3;

const createContainer = (overrides: Partial<IShift>): IShift =>
  ({
    startShift: '08:00:00',
    endShift: '16:00:00',
    cuttingAfterMidnight: false,
    isMonday: false,
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

const variantsOf = (shift: IShift) =>
  new ContainerTemplateSlotCalculationService()
    .calculateTemplateGrid(shift)
    .slots.map((row) => ({
      weekday: row[0].weekday,
      isHoliday: row[0].isHoliday,
      isWeekdayAndHoliday: row[0].isWeekdayAndHoliday,
    }));

describe('ContainerTemplateSlotCalculationService holiday variants', () => {
  it('creates only normal slots for a container without holiday option', () => {
    const variants = variantsOf(createContainer({ isMonday: true, isWednesday: true }));

    expect(variants).toEqual([
      { weekday: MONDAY, isHoliday: false, isWeekdayAndHoliday: false },
      { weekday: WEDNESDAY, isHoliday: false, isWeekdayAndHoliday: false },
    ]);
  });

  it('creates a normal and a holiday slot per ticked weekday for a +FT container', () => {
    const variants = variantsOf(
      createContainer({ isMonday: true, isWednesday: true, isWeekdayAndHoliday: true }),
    );

    expect(variants).toEqual([
      { weekday: MONDAY, isHoliday: false, isWeekdayAndHoliday: false },
      { weekday: MONDAY, isHoliday: true, isWeekdayAndHoliday: true },
      { weekday: WEDNESDAY, isHoliday: false, isWeekdayAndHoliday: false },
      { weekday: WEDNESDAY, isHoliday: true, isWeekdayAndHoliday: true },
    ]);
  });

  it('creates a normal slot per ticked weekday plus exactly one holiday slot for an FT container', () => {
    const variants = variantsOf(
      createContainer({ isMonday: true, isWednesday: true, isHoliday: true }),
    );

    expect(variants).toEqual([
      { weekday: MONDAY, isHoliday: false, isWeekdayAndHoliday: false },
      { weekday: WEDNESDAY, isHoliday: false, isWeekdayAndHoliday: false },
      { weekday: FT_HOLIDAY_TEMPLATE_WEEKDAY, isHoliday: true, isWeekdayAndHoliday: false },
    ]);
  });

  it('keeps the FT holiday slot on its fixed weekday whatever days are ticked', () => {
    const variants = variantsOf(createContainer({ isWednesday: true, isHoliday: true }));

    expect(variants.filter((v) => v.isHoliday)).toEqual([
      { weekday: FT_HOLIDAY_TEMPLATE_WEEKDAY, isHoliday: true, isWeekdayAndHoliday: false },
    ]);
  });

  it('creates the FT holiday slot even without any ticked weekday', () => {
    const variants = variantsOf(createContainer({ isHoliday: true }));

    expect(variants).toEqual([
      { weekday: FT_HOLIDAY_TEMPLATE_WEEKDAY, isHoliday: true, isWeekdayAndHoliday: false },
    ]);
  });

  it('splits every variant into two day slots when the container crosses midnight', () => {
    const grid = new ContainerTemplateSlotCalculationService().calculateTemplateGrid(
      createContainer({
        isMonday: true,
        isHoliday: true,
        startShift: '22:00:00',
        endShift: '06:00:00',
      }),
    );

    expect(grid.crossesMidnight).toBe(true);
    expect(grid.slots.map((row) => [row[0].isHoliday, row[0].dayIndex])).toEqual([
      [false, 0],
      [false, 1],
      [true, 0],
      [true, 1],
    ]);
  });
});
