// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Resolves the container template slot (normal, generic holiday, holiday of the weekday) a container runs on a given day,
 * as the backend's get_shift_schedule picks the template. The available-task list and the autofill take this slot and
 * offer the tasks the schedule engine runs on the days the slot applies on.
 * @param isHolidayDay - Whether the day is a public holiday (or the holiday template is edited)
 * @param container - Holiday flags of the container shift: isHoliday = one generic template for every holiday (FT),
 *   isWeekdayAndHoliday = a holiday template per ticked weekday (+FT); unknown or neither on a holiday day falls back to the
 *   generic holiday slot, like the backend does for a missing isWeekdayAndHoliday
 */

import { IContainerTemplateHolidayVariant } from '../models/container/container-template-holiday-variant';
import { IShift } from '../models/shift/shift.interface';

const NORMAL_SLOT: IContainerTemplateHolidayVariant = { isHoliday: false, isWeekdayAndHoliday: false };
const GENERIC_HOLIDAY_SLOT: IContainerTemplateHolidayVariant = { isHoliday: true, isWeekdayAndHoliday: false };
const WEEKDAY_HOLIDAY_SLOT: IContainerTemplateHolidayVariant = { isHoliday: true, isWeekdayAndHoliday: true };

export function resolveContainerHolidaySlot(
  isHolidayDay: boolean,
  container: Pick<IShift, 'isHoliday' | 'isWeekdayAndHoliday'> | null | undefined,
): IContainerTemplateHolidayVariant {
  if (!isHolidayDay) {
    return { ...NORMAL_SLOT };
  }
  if (container?.isWeekdayAndHoliday) {
    return { ...WEEKDAY_HOLIDAY_SLOT };
  }
  return { ...GENERIC_HOLIDAY_SLOT };
}
