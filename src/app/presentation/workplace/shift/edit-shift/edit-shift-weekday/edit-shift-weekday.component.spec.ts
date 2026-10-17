// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { ShiftEditPermissionService } from 'src/app/application/services/shift-edit-permission.service';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { ShiftFormService } from '../services/shift-form.service';
import { EditShiftWeekdayComponent } from './edit-shift-weekday.component';

const NO_WEEKDAYS: Partial<IShift> = {
  isMonday: false,
  isTuesday: false,
  isWednesday: false,
  isThursday: false,
  isFriday: false,
  isSaturday: false,
  isSunday: false,
  isHoliday: false,
  isWeekdayAndHoliday: false,
};

const ALL_WEEKDAYS: Partial<IShift> = {
  ...NO_WEEKDAYS,
  isMonday: true,
  isTuesday: true,
  isWednesday: true,
  isThursday: true,
  isFriday: true,
  isSaturday: true,
  isSunday: true,
};

describe('EditShiftWeekdayComponent holiday options', () => {
  let editShift: Partial<IShift> | undefined;
  let editShiftDummy: Partial<IShift> | undefined;

  const createComponent = (): EditShiftWeekdayComponent => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DataManagementShiftService,
          useValue: {
            get editShift() {
              return editShift;
            },
            get editShiftDummy() {
              return editShiftDummy;
            },
            makeValidation: () => undefined,
          },
        },
        {
          provide: ShiftEditPermissionService,
          useValue: { canWriteCurrentShift: () => true, isCurrentShiftStatusLocked: () => false },
        },
        { provide: ShiftFormService, useValue: {} },
        { provide: WorkTimeCalculationService, useValue: {} },
      ],
    });
    TestBed.overrideComponent(EditShiftWeekdayComponent, { set: { template: '', imports: [] } });

    return TestBed.createComponent(EditShiftWeekdayComponent).componentInstance;
  };

  beforeEach(() => {
    editShift = { ...NO_WEEKDAYS };
    editShiftDummy = { ...NO_WEEKDAYS };
  });

  describe('validateWeekdays', () => {
    it('is undefined without an edited shift', () => {
      editShift = undefined;
      const component = createComponent();

      component.validateWeekdays();

      expect(component.areWeekdaysValid).toBeUndefined();
    });

    it('is invalid without any ticked weekday and without a holiday option', () => {
      const component = createComponent();

      component.validateWeekdays();

      expect(component.areWeekdaysValid).toBe(false);
    });

    it('is invalid with +FT but no ticked weekday because the shift would never run', () => {
      editShift = { ...NO_WEEKDAYS, isWeekdayAndHoliday: true };
      const component = createComponent();

      component.validateWeekdays();

      expect(component.areWeekdaysValid).toBe(false);
    });

    it('is valid with FT alone as a holiday-only shift', () => {
      editShift = { ...NO_WEEKDAYS, isHoliday: true };
      const component = createComponent();

      component.validateWeekdays();

      expect(component.areWeekdaysValid).toBe(true);
    });

    it('is valid with a ticked weekday and no holiday option', () => {
      editShift = { ...NO_WEEKDAYS, isWednesday: true };
      const component = createComponent();

      component.validateWeekdays();

      expect(component.areWeekdaysValid).toBe(true);
    });

    it('is valid with a ticked weekday and +FT', () => {
      editShift = { ...NO_WEEKDAYS, isMonday: true, isWeekdayAndHoliday: true };
      const component = createComponent();

      component.validateWeekdays();

      expect(component.areWeekdaysValid).toBe(true);
    });
  });

  describe('all seven weekdays ticked', () => {
    it('keeps FT when chosen and does not force +FT', () => {
      editShift = { ...ALL_WEEKDAYS, isHoliday: true };
      const component = createComponent();

      component.validateWeekdays();

      expect(editShift.isHoliday).toBe(true);
      expect(editShift.isWeekdayAndHoliday).toBe(false);
      expect(component.areWeekdaysValid).toBe(true);
    });

    it('leaves both holiday options off when none is chosen', () => {
      editShift = { ...ALL_WEEKDAYS };
      const component = createComponent();

      component.validateWeekdays();

      expect(editShift.isHoliday).toBe(false);
      expect(editShift.isWeekdayAndHoliday).toBe(false);
    });

    it('does not touch the comparison dummy', () => {
      editShift = { ...ALL_WEEKDAYS };
      const component = createComponent();

      component.validateWeekdays();

      expect(editShiftDummy?.isHoliday).toBe(false);
      expect(editShiftDummy?.isWeekdayAndHoliday).toBe(false);
    });
  });

  describe('FT and +FT stay mutually exclusive', () => {
    it('clears +FT when FT is chosen', () => {
      editShift = { ...NO_WEEKDAYS, isMonday: true, isHoliday: true, isWeekdayAndHoliday: true };
      const component = createComponent();

      component.onHolidayChange();

      expect(editShift.isHoliday).toBe(true);
      expect(editShift.isWeekdayAndHoliday).toBe(false);
    });

    it('clears FT when +FT is chosen', () => {
      editShift = { ...NO_WEEKDAYS, isMonday: true, isHoliday: true, isWeekdayAndHoliday: true };
      const component = createComponent();

      component.onWeekdayOrHolidayChange();

      expect(editShift.isHoliday).toBe(false);
      expect(editShift.isWeekdayAndHoliday).toBe(true);
    });

    it('marks the form invalid when +FT replaces FT without a ticked weekday', () => {
      editShift = { ...NO_WEEKDAYS, isHoliday: true, isWeekdayAndHoliday: true };
      const component = createComponent();

      component.onWeekdayOrHolidayChange();

      expect(component.areWeekdaysValid).toBe(false);
    });
  });
});
