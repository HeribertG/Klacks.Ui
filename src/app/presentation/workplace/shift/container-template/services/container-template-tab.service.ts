// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for managing tab selection, weekday changes and available task filtering in container templates.
 * @param selectedTabIndex - Index of the currently selected container template tab
 * @param isEmploymentTabActive - Whether the employment overview tab is active
 * @param availableTasks - Currently filtered and sorted list of available shifts for drag-and-drop
 */
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import {
  IContainerTemplateGrid,
  IContainerTemplateSlot,
} from 'src/app/domain/models/container/container-template-slot';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';

@Injectable()
export class ContainerTemplateTabService {
  private containerService = inject(DataManagementContainerService);
  private shiftService = inject(ContainerTemplateShiftService);
  private translateService = inject(TranslateService);
  private sortingService = inject(TableSortingService);

  public selectedTabIndex = 0;
  public isEmploymentTabActive = false;
  public availableTasks: IShift[] = [];

  selectTab(index: number): void {
    this.selectedTabIndex = index;
    this.isEmploymentTabActive = false;
    this.shiftService.setSelectedShift(null);
  }

  selectEmploymentTab(): void {
    this.isEmploymentTabActive = true;
    this.selectedTabIndex = -1;
    this.shiftService.setSelectedShift(null);
    this.availableTasks = [];
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
    templateGrid: IContainerTemplateGrid | null,
    currentSearchString: string,
    currentIncludeAddress: boolean,
  ): void {
    const filteredRows = this.getFilteredRowsForSelectedWeekday(
      selectedWeekday,
      templateGrid,
    );
    if (
      filteredRows.length === 0 ||
      this.selectedTabIndex >= filteredRows.length
    ) {
      this.availableTasks = [];
      return;
    }

    const row = filteredRows[this.selectedTabIndex];
    const allShifts: IShift[] = [];

    row.forEach((slot) => {
      if (slot.availableTasks) {
        allShifts.push(...slot.availableTasks);
      }
    });

    let uniqueShifts = this.containerService.getUniqueShifts(allShifts);

    const selectedShiftIds = this.shiftService
      .selectedContainerTemplateItemsSignal()
      .map((item) => item.shiftId)
      .filter((id) => id != null);

    uniqueShifts = uniqueShifts.filter(
      (shift) => !selectedShiftIds.includes(shift.id!),
    );

    uniqueShifts = this.containerService.filterAvailableTasksBySearch(
      uniqueShifts,
      currentSearchString,
      currentIncludeAddress,
    );

    const orderBy = this.sortingService.getCurrentOrderBy();
    const sortOrder = this.sortingService.getCurrentSortOrder();

    this.availableTasks = this.containerService.sortShifts(
      uniqueShifts,
      orderBy || '',
      sortOrder,
    );
  }

  getFilteredRowsForSelectedWeekday(
    selectedWeekday: string | null,
    templateGrid: IContainerTemplateGrid | null,
  ): IContainerTemplateSlot[][] {
    if (!selectedWeekday) {
      return [];
    }

    const weekdayNumber = this.containerService.getWeekdayNumber(selectedWeekday);
    return this.containerService.getFilteredRowsForWeekday(
      templateGrid,
      weekdayNumber,
    );
  }

  getTabLabel(
    rowIndex: number,
    selectedWeekday: string | null,
    templateGrid: IContainerTemplateGrid | null,
  ): string {
    const filteredRows = this.getFilteredRowsForSelectedWeekday(
      selectedWeekday,
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
