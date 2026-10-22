// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Service for managing tab selection, weekday changes and available task filtering in container templates.
 * @param selectedTabIndex - Index of the currently selected container template tab
 * @param isEmploymentTabActive - Whether the employment overview tab is active
 * @param availableTasks - Currently filtered and sorted list of available shifts for drag-and-drop
 * @param isHoliday - Whether the holiday variant of the selected weekday is edited; filters the tabs to that variant
 */
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { IAbsence } from 'src/app/domain/models/absence/absence.interface';
import { IContainerTemplateSlot } from 'src/app/domain/models/container/container-template-slot';
import { IContainerTemplateGrid } from 'src/app/domain/models/container/container-template-grid.interface';
import { ContainerTaskService } from 'src/app/domain/services/container/container-task.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { ContainerAbsenceService } from 'src/app/domain/services/absence/container-absence.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';

@Injectable()
export class ContainerTemplateTabService {
  private taskService = inject(ContainerTaskService);
  private shiftService = inject(ContainerTemplateShiftService);
  private containerAbsenceService = inject(ContainerAbsenceService);
  private translateService = inject(TranslateService);
  private sortingService = inject(TableSortingService);

  public selectedTabIndex = 0;
  public isEmploymentTabActive = false;
  public availableTasks: IShift[] = [];
  public containerAbsences: IAbsence[] = [];

  selectTab(index: number): void {
    this.selectedTabIndex = index;
    this.isEmploymentTabActive = false;
    this.shiftService.setSelectedShift(null);
  }

  async selectEmploymentTab(): Promise<void> {
    this.isEmploymentTabActive = true;
    this.selectedTabIndex = -1;
    this.shiftService.setSelectedShift(null);
    this.availableTasks = [];
    await this.loadContainerAbsences();
  }

  private async loadContainerAbsences(): Promise<void> {
    this.containerAbsences = await firstValueFrom(this.containerAbsenceService.readContainerAbsences());
  }

  onWeekdayChange(selectedWeekday: string | null): void {
    this.selectedTabIndex = 0;
    this.shiftService.setSelectedShift(null);
    if (selectedWeekday) {
      this.shiftService.setCurrentWeekday(selectedWeekday);
    }
  }

  updateAvailableTasks(
    selectedWeekday: string | null,
    isHoliday: boolean,
    templateGrid: IContainerTemplateGrid | null,
    currentSearchString: string,
    currentIncludeAddress: boolean,
  ): void {
    const filteredRows = this.getFilteredRowsForSelectedWeekday(
      selectedWeekday,
      isHoliday,
      templateGrid,
    );
    const row = filteredRows[this.selectedTabIndex];
    if (!row) {
      this.availableTasks = [];
      return;
    }

    const allShifts: IShift[] = [];

    row.forEach((slot) => {
      if (slot.availableTasks) {
        allShifts.push(...slot.availableTasks);
      }
    });

    let uniqueShifts = this.taskService.getUniqueShifts(allShifts);

    const selectedShiftIds = this.shiftService
      .selectedContainerTemplateItemsSignal()
      .map((item) => item.shiftId)
      .filter((id) => id != null);

    uniqueShifts = uniqueShifts.filter(
      (shift) => !selectedShiftIds.includes(shift.id!),
    );

    uniqueShifts = this.taskService.filterAvailableTasksBySearch(
      uniqueShifts,
      currentSearchString,
      currentIncludeAddress,
    );

    const orderBy = this.sortingService.getCurrentOrderBy();
    const sortOrder = this.sortingService.getCurrentSortOrder();

    this.availableTasks = this.taskService.sortShifts(
      uniqueShifts,
      orderBy || '',
      sortOrder,
    );
  }

  getFilteredRowsForSelectedWeekday(
    selectedWeekday: string | null,
    isHoliday: boolean,
    templateGrid: IContainerTemplateGrid | null,
  ): IContainerTemplateSlot[][] {
    if (!selectedWeekday) {
      return [];
    }

    const weekdayNumber = this.taskService.getWeekdayNumber(selectedWeekday);
    return this.taskService
      .getFilteredRowsForWeekday(templateGrid, weekdayNumber)
      .filter((row) => row[0].isHoliday === isHoliday);
  }

  getTabLabel(
    rowIndex: number,
    selectedWeekday: string | null,
    isHoliday: boolean,
    templateGrid: IContainerTemplateGrid | null,
  ): string {
    const filteredRows = this.getFilteredRowsForSelectedWeekday(
      selectedWeekday,
      isHoliday,
      templateGrid,
    );
    if (filteredRows.length === 0 || rowIndex >= filteredRows.length) {
      return '';
    }

    const firstSlot = filteredRows[rowIndex][0];
    const label = firstSlot.label;

    const match = label.match(/^(\w+)\s*\(([^)]+)\)$/);
    if (!match) {
      return label;
    }

    const [, weekdayEn, holidayLabelEn] = match;

    const weekdayKey = `shift.container-template.weekday-full.${weekdayEn.toLowerCase()}`;
    const weekdayTranslated = this.translateService.instant(weekdayKey);

    const holidayKey = `shift.container-template.holiday-label.${this.getHolidayLabelKey(
      holidayLabelEn,
    )}`;
    const holidayTranslated = this.translateService.instant(holidayKey);

    const timeRange = templateGrid?.crossesMidnight
      ? ` ${this.formatSlotTime(firstSlot.fromTime)} - ${this.formatSlotTime(firstSlot.untilTime)}`
      : '';

    if (holidayTranslated) {
      return `${weekdayTranslated} ${holidayTranslated}${timeRange}`;
    }
    return `${weekdayTranslated}${timeRange}`;
  }

  private formatSlotTime(time: string): string {
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
  }

  private getHolidayLabelKey(label: string): string {
    const normalized = label.toLowerCase().trim();
    switch (normalized) {
      case 'normal':
        return 'normal';
      case 'weekday':
        return 'weekday';
      case 'holiday':
        return 'holiday';
      case 'holiday only':
        return 'holiday-only';
      default:
        return 'normal';
    }
  }
}
