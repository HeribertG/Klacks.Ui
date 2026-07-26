// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Facade service for shift operations: arrangement, compaction, time range updates, and conversion.
 * @param arrangementService - Arranges shifts sequentially and inserts new items
 * @param itemManipulationService - Updates time range start times of individual items
 * @param timeRangeService - Calculates time duration and parses time strings
 * @param shiftService - Manages the selected container template items
 * @param containerService - Updates the order in the templates
 */
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { IAbsence } from 'src/app/domain/models/absence/absence-class';
import {
  IContainerTemplateItem,
} from 'src/app/domain/models/container/container-template-class';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { ShiftArrangementService } from './shift-arrangement.service';
import { ContainerTemplateItemManipulationService } from './container-template-item-manipulation.service';
import { TimeRangeService } from 'src/app/presentation/shared/time-ruler/services/time-range.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ContainerTemplatePdfExportService } from './container-template-pdf-export.service';
import { ContainerTemplateRouteService } from './container-template-route.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import {
  timeToString,
  timeToMinutes,
} from 'src/app/shared/helpers/time-format.helper';
import { convertShiftToContainerTemplateItem } from 'src/app/shared/helpers/container-template-format.helper';

@Injectable()
export class ContainerTemplateShiftOperationsService {
  private arrangementService = inject(ShiftArrangementService);
  private itemManipulationService = inject(ContainerTemplateItemManipulationService);
  private timeRangeService = inject(TimeRangeService);
  private shiftService = inject(ContainerTemplateShiftService);
  private containerService = inject(DataManagementContainerService);
  private translateService = inject(TranslateService);
  private toastService = inject(ToastShowService);
  private pdfExportService = inject(ContainerTemplatePdfExportService);
  private routeService = inject(ContainerTemplateRouteService);
  private workplaceStateService = inject(WorkplaceStateService);

  calculateDuration(timeFrom: OwnTime, timeTo: OwnTime): OwnTime {
    return this.timeRangeService.calculateDuration(timeFrom, timeTo);
  }

  getTimeRangeStartTime(item: IContainerTemplateItem): OwnTime {
    if (!item.timeRangeStartItem) {
      return OwnTime.forTime('00', '00');
    }
    const parsed = this.timeRangeService.parseTimeString(
      item.timeRangeStartItem,
    );
    if (!parsed) {
      return OwnTime.forTime('00', '00');
    }
    return OwnTime.forTime(
      parsed.hours.toString().padStart(2, '0'),
      parsed.minutes.toString().padStart(2, '0'),
    );
  }

  onTimeRangeStartChange(
    item: IContainerTemplateItem,
    newTime: OwnTime,
  ): void {
    const desiredStartMinutes =
      parseInt(newTime.hours) * 60 + parseInt(newTime.minutes);
    const allItems = this.shiftService.selectedContainerTemplateItemsSignal();
    const targetItemId = item.id || item.tmpId;

    const updatedItems = this.itemManipulationService.updateItemTimeRangeStart(
      item,
      desiredStartMinutes,
      allItems,
    );

    this.shiftService.setSelectedContainerTemplateItems(updatedItems);
    this.shiftService.setSelectedShift(null);
    const updatedItem = updatedItems.find(
      (i) => (i.id || i.tmpId) === targetItemId,
    );
    if (updatedItem) {
      this.shiftService.setSelectedShift(updatedItem);
    }
  }

  arrangeAndSetItems(
    containerTemplateItems: IContainerTemplateItem[],
    timeFrom: OwnTime,
    timeTo: OwnTime,
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    if (containerTemplateItems.length === 0) {
      this.shiftService.setSelectedContainerTemplateItems(containerTemplateItems);
      return;
    }

    const containerTimeFrom = timeToString(
      parseInt(timeFrom.hours),
      parseInt(timeFrom.minutes),
    );
    const containerTimeUntil = timeToString(
      parseInt(timeTo.hours),
      parseInt(timeTo.minutes),
    );

    const arrangedItems = this.arrangementService.arrangeShifts(
      containerTemplateItems,
      containerTimeFrom,
      containerTimeUntil,
    );

    this.shiftService.setSelectedContainerTemplateItems(arrangedItems);
    this.updateTemplateOrder(arrangedItems, selectedWeekday, isHoliday);
  }

  insertNewItemWithMinimalRepositioning(
    containerTemplateItems: IContainerTemplateItem[],
    newItemIndex: number,
    timeFrom: OwnTime,
    timeTo: OwnTime,
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    if (containerTemplateItems.length === 0) {
      this.shiftService.setSelectedContainerTemplateItems(containerTemplateItems);
      return;
    }

    const containerTimeFrom = timeToString(
      parseInt(timeFrom.hours),
      parseInt(timeFrom.minutes),
    );
    const containerTimeUntil = timeToString(
      parseInt(timeTo.hours),
      parseInt(timeTo.minutes),
    );

    const arrangedItems =
      this.arrangementService.insertItemWithMinimalRepositioning(
        containerTemplateItems,
        newItemIndex,
        containerTimeFrom,
        containerTimeUntil,
      );

    this.shiftService.setSelectedContainerTemplateItems(arrangedItems);
    this.updateTemplateOrder(arrangedItems, selectedWeekday, isHoliday);
  }

  compactAndSetItems(
    containerTemplateItems: IContainerTemplateItem[],
    timeFrom: OwnTime,
    timeTo: OwnTime,
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    if (containerTemplateItems.length === 0) {
      this.shiftService.setSelectedContainerTemplateItems(containerTemplateItems);
      return;
    }

    const containerTimeFrom = timeToString(
      parseInt(timeFrom.hours),
      parseInt(timeFrom.minutes),
    );
    const containerTimeUntil = timeToString(
      parseInt(timeTo.hours),
      parseInt(timeTo.minutes),
    );

    const compactedItems = this.arrangementService.compactShifts(
      containerTemplateItems,
      containerTimeFrom,
      containerTimeUntil,
    );

    this.shiftService.setSelectedContainerTemplateItems(compactedItems);
    this.updateTemplateOrder(compactedItems, selectedWeekday, isHoliday);
  }

  convertShiftToContainerTemplateItem = convertShiftToContainerTemplateItem;

  convertAbsenceToContainerTemplateItem(
    absence: IAbsence,
    startTime: string,
    endTime: string,
  ): IContainerTemplateItem {
    return {
      tmpId: crypto.randomUUID(),
      shiftId: undefined,
      absenceId: absence.id,
      absence: absence,
      startItem: startTime,
      endItem: endTime,
      briefingTime: '00:00',
      debriefingTime: '00:00',
      travelTimeAfter: '00:00',
      travelTimeBefore: '00:00',
      timeRangeStartItem: '',
      timeRangeEndItem: '',
    };
  }

  hasTimeRangeViolation(item: IContainerTemplateItem): boolean {
    if (!item.shift?.isTimeRange || !item.timeRangeStartItem) {
      return false;
    }
    const plannedStart = timeToMinutes(item.timeRangeStartItem);
    const plannedEnd = timeToMinutes(item.timeRangeEndItem);
    const shiftRangeStart = timeToMinutes(item.shift.startShift);
    const shiftRangeEnd = timeToMinutes(item.shift.endShift);

    return plannedStart < shiftRangeStart || plannedEnd > shiftRangeEnd;
  }

  isTimeRangePartial(shift: IShift, timeFrom: OwnTime, timeTo: OwnTime): boolean {
    if (!shift.isTimeRange) {
      return false;
    }
    const containerFrom = timeToMinutes(
      timeToString(parseInt(timeFrom.hours), parseInt(timeFrom.minutes)),
    );
    const containerUntil = timeToMinutes(
      timeToString(parseInt(timeTo.hours), parseInt(timeTo.minutes)),
    );
    const shiftStart = timeToMinutes(shift.startShift);
    const shiftEnd = timeToMinutes(shift.endShift);

    return shiftStart < containerFrom || shiftEnd > containerUntil;
  }

  exportSelectedShiftsToPdf(
    containerShift: IShift | null,
    selectedWeekday: string | null,
    timeFrom: OwnTime,
    timeTo: OwnTime,
  ): void {
    const items = this.shiftService.selectedContainerTemplateItemsSignal();

    if (items.length === 0) {
      return;
    }

    const containerName = containerShift?.name || 'Container Template';
    const weekday = selectedWeekday || '';
    const timeFromStr = timeToString(
      parseInt(timeFrom.hours),
      parseInt(timeFrom.minutes),
    );
    const timeToStr = timeToString(
      parseInt(timeTo.hours),
      parseInt(timeTo.minutes),
    );

    this.pdfExportService.exportContainerTemplateToPdf(
      items,
      containerName,
      weekday,
      timeFromStr,
      timeToStr,
    );
  }

  exportRouteToPdf(
    containerShift: IShift | null,
    selectedWeekday: string | null,
    timeFrom: OwnTime,
  ): void {
    const items = this.shiftService.selectedContainerTemplateItemsSignal();

    if (items.length === 0) {
      this.toastService.showInfo(
        this.translateService.instant(
          'shift.container-template.toast.no-shifts-export',
        ),
      );
      return;
    }

    if (!this.routeService.lastRouteInfo) {
      this.toastService.showInfo(
        this.translateService.instant(
          'shift.container-template.toast.optimize-first',
        ),
      );
      return;
    }

    const containerName = containerShift?.name || 'Route';
    const weekday = selectedWeekday || '';
    const timeFromStr = timeToString(
      parseInt(timeFrom.hours),
      parseInt(timeFrom.minutes),
    );

    this.pdfExportService.exportRouteToPdf(
      items,
      this.routeService.lastRouteInfo,
      containerName,
      weekday,
      timeFromStr,
    );
  }

  compactSelectedShifts(
    timeFrom: OwnTime,
    timeTo: OwnTime,
    selectedWeekday: string | null,
    isHoliday: boolean,
    keepTravelAndBriefing = false,
  ): void {
    const currentItems =
      this.shiftService.selectedContainerTemplateItemsSignal();
    const preparedItems = keepTravelAndBriefing
      ? currentItems.map((item) => ({ ...item }))
      : currentItems.map((item) => ({
          ...item,
          travelTimeBefore: '00:00',
          travelTimeAfter: '00:00',
          briefingTime: '00:00',
        }));
    this.compactAndSetItems(
      preparedItems,
      timeFrom,
      timeTo,
      selectedWeekday,
      isHoliday,
    );
    this.shiftService.setSelectedShift(null);
  }

  removeTask(
    item: IContainerTemplateItem,
    selectedWeekday: string | null,
    isHoliday: boolean,
    updateAvailableTasksFn: () => void,
  ): void {
    const itemIdentifier = item.id || item.tmpId;
    if (itemIdentifier) {
      if (selectedWeekday) {
        const weekdayNumber = this.containerService.getWeekdayNumber(
          selectedWeekday,
        );

        if (item.shift) {
          this.containerService.addShiftToAvailableTasks(
            item.shift,
            weekdayNumber,
          );
          updateAvailableTasksFn();
        }

        this.containerService.removeTaskItemFromTemplates(
          itemIdentifier,
          weekdayNumber,
          isHoliday,
        );
      }

      this.shiftService.removeTask(itemIdentifier);
      this.workplaceStateService.areObjectsDirty();
    }
  }

  private updateTemplateOrder(
    items: IContainerTemplateItem[],
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    if (selectedWeekday) {
      const weekdayNumber = this.containerService.getWeekdayNumber(
        selectedWeekday,
      );
      this.containerService.updateTaskOrderInTemplates(
        items,
        weekdayNumber,
        isHoliday,
      );
    }
  }
}
