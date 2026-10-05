// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach } from 'vitest';
import { ScriptService, ExternalVariables } from './script.service';

const ALL_SHIFT_MACRO = `
import hour
import fromhour
import untilhour
import weekday
import holiday
import holidaynextday
import nightrate
import holidayrate
import we1rate
import we2rate

FUNCTION SegBonusForType(StartTime, EndTime, HolidayFlag, WeekdayNum, WantType)
    DIM SegmentHours, NightHours, NonNightHours, Amount
    DIM NRate, DRate, NType, DType, HasHoliday, IsSaturday, IsSunday

    SegmentHours = TimeToHours(EndTime) - TimeToHours(StartTime)
    IF SegmentHours < 0 THEN SegmentHours = SegmentHours + 24 ENDIF

    NightHours = TimeOverlap("23:00", "06:00", StartTime, EndTime)
    NonNightHours = SegmentHours - NightHours

    HasHoliday = HolidayFlag = 1
    IsSaturday = WeekdayNum = 6
    IsSunday = WeekdayNum = 7

    NRate = 0
    NType = 0
    IF NightHours > 0 THEN
        NRate = NightRate
        NType = 10
    ENDIF
    IF HasHoliday AndAlso HolidayRate > NRate THEN
        NRate = HolidayRate
        NType = 14
    ENDIF
    IF IsSaturday AndAlso WE1Rate > NRate THEN
        NRate = WE1Rate
        NType = 11
    ENDIF
    IF IsSunday AndAlso WE2Rate > NRate THEN
        NRate = WE2Rate
        NType = 12
    ENDIF

    DRate = 0
    DType = 0
    IF HasHoliday AndAlso HolidayRate > DRate THEN
        DRate = HolidayRate
        DType = 14
    ENDIF
    IF IsSaturday AndAlso WE1Rate > DRate THEN
        DRate = WE1Rate
        DType = 11
    ENDIF
    IF IsSunday AndAlso WE2Rate > DRate THEN
        DRate = WE2Rate
        DType = 12
    ENDIF

    Amount = 0
    IF NType = WantType THEN Amount = Amount + NightHours * NRate ENDIF
    IF DType = WantType THEN Amount = Amount + NonNightHours * DRate ENDIF

    SegBonusForType = Amount
ENDFUNCTION

DIM TotalBonus, WeekdayNextDay
DIM BonusNight, BonusWeekend1, BonusWeekend2, BonusHoliday

WeekdayNextDay = (Weekday MOD 7) + 1

IF TimeToHours(UntilHour) <= TimeToHours(FromHour) THEN
    BonusNight = SegBonusForType(FromHour, "00:00", Holiday, Weekday, 10) + SegBonusForType("00:00", UntilHour, HolidayNextDay, WeekdayNextDay, 10)
    BonusWeekend1 = SegBonusForType(FromHour, "00:00", Holiday, Weekday, 11) + SegBonusForType("00:00", UntilHour, HolidayNextDay, WeekdayNextDay, 11)
    BonusWeekend2 = SegBonusForType(FromHour, "00:00", Holiday, Weekday, 12) + SegBonusForType("00:00", UntilHour, HolidayNextDay, WeekdayNextDay, 12)
    BonusHoliday = SegBonusForType(FromHour, "00:00", Holiday, Weekday, 14) + SegBonusForType("00:00", UntilHour, HolidayNextDay, WeekdayNextDay, 14)
ELSE
    BonusNight = SegBonusForType(FromHour, UntilHour, Holiday, Weekday, 10)
    BonusWeekend1 = SegBonusForType(FromHour, UntilHour, Holiday, Weekday, 11)
    BonusWeekend2 = SegBonusForType(FromHour, UntilHour, Holiday, Weekday, 12)
    BonusHoliday = SegBonusForType(FromHour, UntilHour, Holiday, Weekday, 14)
ENDIF

TotalBonus = BonusNight + BonusWeekend1 + BonusWeekend2 + BonusHoliday

OUTPUT 1, Round(TotalBonus, 2)
OUTPUT 10, BonusNight
OUTPUT 11, BonusWeekend1
OUTPUT 12, BonusWeekend2
OUTPUT 14, BonusHoliday
`;

const SEEDED_MIDNIGHT_MACRO = ALL_SHIFT_MACRO.replaceAll('FromHour, "00:00"', 'FromHour, "24:00"');

const BACKEND_TRUE_FLAG = 1;
const BACKEND_FALSE_FLAG = 0;

const OUTPUT_TOTAL = 1;
const OUTPUT_NIGHT = 10;
const OUTPUT_WEEKEND2 = 12;
const OUTPUT_HOLIDAY = 14;

const WEDNESDAY = 3;
const SUNDAY = 7;
const PRECISION_DIGITS = 10;

interface ShiftVector {
  fromHour: string;
  untilHour: string;
  weekday: number;
  holiday: boolean;
  holidayNextDay: boolean;
  nightRate: number;
  holidayRate: number;
  we1Rate: number;
  we2Rate: number;
}

const DAY_SHIFT: ShiftVector = {
  fromHour: '08:00',
  untilHour: '16:00',
  weekday: WEDNESDAY,
  holiday: false,
  holidayNextDay: false,
  nightRate: 0.25,
  holidayRate: 0.15,
  we1Rate: 0.1,
  we2Rate: 0.1,
};

const SUNDAY_NIGHT_INTO_NEXT_DAY: ShiftVector = {
  fromHour: '20:00',
  untilHour: '04:00',
  weekday: SUNDAY,
  holiday: false,
  holidayNextDay: false,
  nightRate: 0.25,
  holidayRate: 0.5,
  we1Rate: 0.1,
  we2Rate: 0.3,
};

describe('AllShift macro holiday flags (FE half of the BE MacroTypedSurchargeTest vectors)', () => {
  let service: ScriptService;

  beforeEach(() => {
    service = new ScriptService();
  });

  function toBackendBinding(vector: ShiftVector): ExternalVariables {
    return {
      hour: 0,
      fromhour: vector.fromHour,
      untilhour: vector.untilHour,
      weekday: vector.weekday,
      holiday: vector.holiday ? BACKEND_TRUE_FLAG : BACKEND_FALSE_FLAG,
      holidaynextday: vector.holidayNextDay ? BACKEND_TRUE_FLAG : BACKEND_FALSE_FLAG,
      nightrate: vector.nightRate,
      holidayrate: vector.holidayRate,
      we1rate: vector.we1Rate,
      we2rate: vector.we2Rate,
    };
  }

  function amountOf(vector: ShiftVector, outputType: number, macro = ALL_SHIFT_MACRO): number {
    const result = service.run(macro, false, true, toBackendBinding(vector));
    expect(result.success, result.error?.description).toBe(true);
    const message = result.messages.find(m => m.type === outputType);
    return message ? parseFloat(message.message) : 0;
  }

  it('credits the holiday surcharge for the whole day shift when the backend flags the day (official and paid)', () => {
    const vector = { ...DAY_SHIFT, holiday: true };

    expect(amountOf(vector, OUTPUT_HOLIDAY)).toBeCloseTo(1.2, PRECISION_DIGITS);
    expect(amountOf(vector, OUTPUT_TOTAL)).toBeCloseTo(1.2, PRECISION_DIGITS);
  });

  it('credits no holiday surcharge when the backend clears the flag (unofficial, unpaid or reminder-only)', () => {
    const vector = { ...DAY_SHIFT, holiday: false };

    expect(amountOf(vector, OUTPUT_HOLIDAY)).toBe(0);
    expect(amountOf(vector, OUTPUT_TOTAL)).toBe(0);
  });

  it('credits the holiday surcharge only for the after-midnight segment when only HolidayNextDay is set', () => {
    const vector = { ...SUNDAY_NIGHT_INTO_NEXT_DAY, holidayNextDay: true };

    expect(amountOf(vector, OUTPUT_HOLIDAY)).toBeCloseTo(2, PRECISION_DIGITS);
    expect(amountOf(vector, OUTPUT_WEEKEND2)).toBeCloseTo(1.2, PRECISION_DIGITS);
    expect(amountOf(vector, OUTPUT_NIGHT)).toBe(0);
    expect(amountOf(vector, OUTPUT_TOTAL)).toBeCloseTo(3.2, PRECISION_DIGITS);
  });

  it('gives the same split when the first segment ends at "24:00" as in the seeded MacrosSeed AllShift macro', () => {
    const vector = { ...SUNDAY_NIGHT_INTO_NEXT_DAY, holidayNextDay: true };

    expect(amountOf(vector, OUTPUT_HOLIDAY, SEEDED_MIDNIGHT_MACRO)).toBeCloseTo(2, PRECISION_DIGITS);
    expect(amountOf(vector, OUTPUT_WEEKEND2, SEEDED_MIDNIGHT_MACRO)).toBeCloseTo(1.2, PRECISION_DIGITS);
    expect(amountOf(vector, OUTPUT_TOTAL, SEEDED_MIDNIGHT_MACRO)).toBeCloseTo(3.2, PRECISION_DIGITS);
  });

  it('credits night instead of holiday for the after-midnight segment when HolidayNextDay is cleared', () => {
    const vector = { ...SUNDAY_NIGHT_INTO_NEXT_DAY, holidayNextDay: false };

    expect(amountOf(vector, OUTPUT_HOLIDAY)).toBe(0);
    expect(amountOf(vector, OUTPUT_NIGHT)).toBeCloseTo(1, PRECISION_DIGITS);
    expect(amountOf(vector, OUTPUT_WEEKEND2)).toBeCloseTo(1.2, PRECISION_DIGITS);
  });
});
