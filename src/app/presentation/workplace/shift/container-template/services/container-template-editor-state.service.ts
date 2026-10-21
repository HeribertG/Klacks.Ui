// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Component-scoped editor state of the container template view: loaded container, time window,
 * weekday/holiday selection, grid, loading and read-only flags, search filter.
 * @param containerShift - The container shift being edited, null until loaded
 * @param selectedWeekday - Weekday name of the edited template; the fixed FT weekday for the every-holiday template
 * @param isHoliday - Whether the holiday template is edited; for an FT container it is the single template of every holiday, for +FT the one of the selected weekday
 * @param weekdays - Selectable weekdays, the container's active weekdays once loaded
 */
import { Injectable, inject } from '@angular/core';
import { Options } from '@angular-slider/ngx-slider';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { IContainerTemplateGrid } from 'src/app/domain/models/container/container-template-grid.interface';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { FT_HOLIDAY_TEMPLATE_WEEKDAY_NAME } from 'src/app/domain/constants/container-template-holiday.constants';
import {
  CONTAINER_TEMPLATE_DEFAULT_TIME_FROM,
  CONTAINER_TEMPLATE_DEFAULT_TIME_TO,
  CONTAINER_TEMPLATE_DEFAULT_TOLERANCE,
  CONTAINER_TEMPLATE_DEFAULT_WEEKDAYS,
  CONTAINER_TEMPLATE_TOLERANCE_SLIDER_OPTIONS,
} from '../container-template.constants';

@Injectable()
export class ContainerTemplateEditorStateService {
  private containerService = inject(DataManagementContainerService);
  private shiftService = inject(ContainerTemplateShiftService);

  containerShift: IShift | null = null;
  templateGrid: IContainerTemplateGrid | null = null;
  isLoading = false;
  isReadOnly = false;
  readOnlyReason = '';

  timeFrom = OwnTime.forTime(CONTAINER_TEMPLATE_DEFAULT_TIME_FROM.hours, CONTAINER_TEMPLATE_DEFAULT_TIME_FROM.minutes);
  timeTo = OwnTime.forTime(CONTAINER_TEMPLATE_DEFAULT_TIME_TO.hours, CONTAINER_TEMPLATE_DEFAULT_TIME_TO.minutes);
  duration: OwnTime = OwnTime.forDuration();

  weekdays: { value: string; labelKey: string }[] = [...CONTAINER_TEMPLATE_DEFAULT_WEEKDAYS];
  selectedWeekday: string | null = null;
  isHoliday = false;
  private weekdayBeforeHoliday: string | null = null;

  timeRangeToleranceValue = CONTAINER_TEMPLATE_DEFAULT_TOLERANCE;
  readonly timeRangeToleranceOptions: Options = { ...CONTAINER_TEMPLATE_TOLERANCE_SLIDER_OPTIONS };

  searchString = '';
  includeAddress = false;

  get hasHolidayVariant(): boolean {
    return !!this.containerShift?.isHoliday || !!this.containerShift?.isWeekdayAndHoliday;
  }

  get isEveryHolidayContainer(): boolean {
    return !!this.containerShift?.isHoliday && !this.containerShift?.isWeekdayAndHoliday;
  }

  get isWeekdaySelectionLocked(): boolean {
    return this.isHoliday && this.isEveryHolidayContainer;
  }

  get isHolidayVariantLocked(): boolean {
    return this.isEveryHolidayContainer && this.weekdays.length === 0;
  }

  selectedWeekdayNumber(): number | null {
    return this.selectedWeekday ? this.containerService.getWeekdayNumber(this.selectedWeekday) : null;
  }

  applyActiveWeekdays(shift: IShift): void {
    const activeWeekdays = this.containerService.getActiveWeekdays(shift);
    this.weekdays = activeWeekdays;
    this.isHoliday = false;
    this.weekdayBeforeHoliday = null;

    if (activeWeekdays.length > 0) {
      this.selectedWeekday = activeWeekdays[0].value;
    } else if (this.isEveryHolidayContainer) {
      this.isHoliday = true;
      this.selectedWeekday = FT_HOLIDAY_TEMPLATE_WEEKDAY_NAME;
    }
    this.syncItemBufferKey();
  }

  applyHolidayVariantToWeekday(): void {
    if (!this.isEveryHolidayContainer) return;

    if (this.isHoliday) {
      this.weekdayBeforeHoliday = this.selectedWeekday;
      this.selectedWeekday = FT_HOLIDAY_TEMPLATE_WEEKDAY_NAME;
    } else {
      this.selectedWeekday = this.weekdayBeforeHoliday ?? this.weekdays[0]?.value ?? null;
    }
  }

  syncItemBufferKey(): void {
    if (this.selectedWeekday) {
      this.shiftService.setCurrentWeekday(
        ContainerTemplateShiftService.bufferKey(this.selectedWeekday, this.isHoliday),
      );
    }
  }

  markReadOnly(reason: string): void {
    this.isReadOnly = true;
    this.readOnlyReason = reason;
  }

  applySearch(searchString: string, includeAddress: boolean): boolean {
    const changed = this.searchString !== searchString || this.includeAddress !== includeAddress;
    if (changed) {
      this.searchString = searchString;
      this.includeAddress = includeAddress;
    }
    return changed;
  }
}
