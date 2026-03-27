// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for absence handling within container templates: modal dialogs, time editing, and insertion.
 * @param shiftOpsService - Converts absences to template items and arranges items
 * @param shiftService - Manages the selected container template items
 * @param ngbModal - Opens modal dialogs
 * @param translateService - Provides current language for localized absence names
 */
import { Injectable, inject, TemplateRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IAbsence } from 'src/app/domain/models/absence/absence-class';
import {
  IContainerTemplateItem,
} from 'src/app/domain/models/container/container-template-class';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { ContainerTemplateShiftOperationsService } from './container-template-shift-operations.service';
import {
  timeToString,
  timeToMinutes,
} from 'src/app/shared/helpers/time-format.helper';

const ABSENCE_DEFAULT_DURATION_MINUTES = 15;
const MINUTES_PER_HOUR = 60;

@Injectable()
export class ContainerTemplateAbsenceService {
  private shiftOpsService = inject(ContainerTemplateShiftOperationsService);
  private shiftService = inject(ContainerTemplateShiftService);
  private ngbModal = inject(NgbModal);
  private translateService = inject(TranslateService);

  absenceStartTime = OwnTime.forTime('08', '00');
  absenceEndTime = OwnTime.forTime('08', '30');
  absenceModalTitle = '';

  insertAbsenceAtPosition(
    absence: IAbsence,
    containerData: IContainerTemplateItem[],
    currentIndex: number,
    timeFrom: OwnTime,
    timeTo: OwnTime,
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    const previousItem = currentIndex > 0 ? containerData[currentIndex - 1] : null;
    let startMinutes: number;

    if (previousItem) {
      const endTime = previousItem.timeRangeEndItem || previousItem.endItem || '';
      startMinutes = endTime
        ? timeToMinutes(endTime)
        : timeToMinutes(timeToString(parseInt(timeFrom.hours), parseInt(timeFrom.minutes)));
    } else {
      startMinutes = timeToMinutes(
        timeToString(parseInt(timeFrom.hours), parseInt(timeFrom.minutes)),
      );
    }

    const endMinutes = startMinutes + ABSENCE_DEFAULT_DURATION_MINUTES;
    const startTime = `${Math.floor(startMinutes / MINUTES_PER_HOUR).toString().padStart(2, '0')}:${(startMinutes % MINUTES_PER_HOUR).toString().padStart(2, '0')}:00`;
    const endTime = `${Math.floor(endMinutes / MINUTES_PER_HOUR).toString().padStart(2, '0')}:${(endMinutes % MINUTES_PER_HOUR).toString().padStart(2, '0')}:00`;

    const item = this.shiftOpsService.convertAbsenceToContainerTemplateItem(
      absence,
      startTime,
      endTime,
    );

    containerData.splice(currentIndex, 0, item);

    this.shiftOpsService.arrangeAndSetItems(
      [...containerData],
      timeFrom,
      timeTo,
      selectedWeekday,
      isHoliday,
    );
  }

  openAbsenceTimeModal(
    item: IContainerTemplateItem,
    absenceTimeModal: TemplateRef<unknown>,
    timeFrom?: OwnTime,
    timeTo?: OwnTime,
    selectedWeekday?: string | null,
    isHoliday?: boolean,
  ): void {
    if (!item.absenceId) return;

    const lang = this.translateService.currentLang || 'de';
    this.absenceModalTitle = item.absence?.name?.[lang] || item.absence?.name?.['de'] || '';

    const startParts = (item.startItem || '00:00').split(':');
    this.absenceStartTime = OwnTime.forTime(
      (startParts[0] || '00').padStart(2, '0'),
      (startParts[1] || '00').padStart(2, '0'),
    );

    const endParts = (item.endItem || '00:00').split(':');
    this.absenceEndTime = OwnTime.forTime(
      (endParts[0] || '00').padStart(2, '0'),
      (endParts[1] || '00').padStart(2, '0'),
    );

    this.ngbModal
      .open(absenceTimeModal, { centered: true })
      .result.then(
        () => this.applyAbsenceTimeEdit(item, timeFrom, timeTo, selectedWeekday, isHoliday),
        () => {},
      );
  }

  private applyAbsenceTimeEdit(
    item: IContainerTemplateItem,
    timeFrom?: OwnTime,
    timeTo?: OwnTime,
    selectedWeekday?: string | null,
    isHoliday?: boolean,
  ): void {
    const newStartTime = timeToString(
      parseInt(this.absenceStartTime.hours),
      parseInt(this.absenceStartTime.minutes),
    );
    const newEndTime = timeToString(
      parseInt(this.absenceEndTime.hours),
      parseInt(this.absenceEndTime.minutes),
    );

    const allItems = this.shiftService.selectedContainerTemplateItemsSignal();
    const itemId = item.id || item.tmpId;
    const updatedItems = allItems.map((i) =>
      (i.id || i.tmpId) === itemId
        ? { ...i, startItem: newStartTime, endItem: newEndTime }
        : i,
    );

    if (timeFrom && timeTo) {
      this.shiftOpsService.arrangeAndSetItems(
        updatedItems,
        timeFrom,
        timeTo,
        selectedWeekday ?? null,
        isHoliday ?? false,
      );
    }
  }

  onAbsenceStartTimeChange(time: OwnTime): void {
    this.absenceStartTime = OwnTime.forTime(time.hours, time.minutes);
  }

  onAbsenceEndTimeChange(time: OwnTime): void {
    this.absenceEndTime = OwnTime.forTime(time.hours, time.minutes);
  }
}
