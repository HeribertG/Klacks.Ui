// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for drag-and-drop operations within the container template grid.
 * @param shiftOpsService - Arranges items and converts shifts to template items
 * @param shiftService - Manages selected shift state
 * @param absenceService - Handles absence insertion at drop position
 */
import { Injectable, inject } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { IAbsence } from 'src/app/domain/models/absence/absence-class';
import {
  IContainerTemplateItem,
} from 'src/app/domain/models/container/container-template-class';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { ContainerTemplateShiftOperationsService } from './container-template-shift-operations.service';
import { ContainerTemplateAbsenceService } from './container-template-absence.service';

const CONNECTED_DROP_LISTS = ['available-tasks-list', 'selected-tasks-list', 'container-absences-list'];

@Injectable()
export class ContainerTemplateDragDropService {
  private shiftOpsService = inject(ContainerTemplateShiftOperationsService);
  private shiftService = inject(ContainerTemplateShiftService);
  private absenceService = inject(ContainerTemplateAbsenceService);

  getConnectedDropLists(): string[] {
    return CONNECTED_DROP_LISTS;
  }

  onTaskDrop(
    event: CdkDragDrop<IContainerTemplateItem[]>,
    timeFrom: OwnTime,
    timeTo: OwnTime,
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    if (event.previousContainer === event.container) {
      this.handleReorder(event, timeFrom, timeTo, selectedWeekday, isHoliday);
      return;
    }

    if (event.container.id === 'selected-tasks-list') {
      if (event.previousContainer.id === 'container-absences-list') {
        this.handleAbsenceDrop(event, timeFrom, timeTo, selectedWeekday, isHoliday);
      } else if (event.previousContainer.id === 'available-tasks-list') {
        this.handleShiftDrop(event, timeFrom, timeTo, selectedWeekday, isHoliday);
      }
    } else if (
      event.previousContainer.id === 'selected-tasks-list' &&
      event.container.id === 'available-tasks-list'
    ) {
      this.handleRemoveFromSelected(event, timeFrom, timeTo, selectedWeekday, isHoliday);
    }
  }

  private handleReorder(
    event: CdkDragDrop<IContainerTemplateItem[]>,
    timeFrom: OwnTime,
    timeTo: OwnTime,
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    moveItemInArray(
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );
    if (event.container.id === 'selected-tasks-list') {
      this.shiftOpsService.arrangeAndSetItems(
        [...event.container.data],
        timeFrom,
        timeTo,
        selectedWeekday,
        isHoliday,
      );
    }
  }

  private handleAbsenceDrop(
    event: CdkDragDrop<IContainerTemplateItem[]>,
    timeFrom: OwnTime,
    timeTo: OwnTime,
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    const absence = (event.previousContainer.data as unknown as IAbsence[])[
      event.previousIndex
    ];
    this.absenceService.insertAbsenceAtPosition(
      absence,
      event.container.data,
      event.currentIndex,
      timeFrom,
      timeTo,
      selectedWeekday,
      isHoliday,
    );
  }

  private handleShiftDrop(
    event: CdkDragDrop<IContainerTemplateItem[]>,
    timeFrom: OwnTime,
    timeTo: OwnTime,
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    const shift = (event.previousContainer.data as unknown as IShift[])[
      event.previousIndex
    ];
    const containerTemplateItem =
      this.shiftOpsService.convertShiftToContainerTemplateItem(shift);

    event.container.data.splice(event.currentIndex, 0, containerTemplateItem);
    (event.previousContainer.data as unknown as IShift[]).splice(event.previousIndex, 1);

    this.shiftOpsService.insertNewItemWithMinimalRepositioning(
      [...event.container.data],
      event.currentIndex,
      timeFrom,
      timeTo,
      selectedWeekday,
      isHoliday,
    );
  }

  private handleRemoveFromSelected(
    event: CdkDragDrop<IContainerTemplateItem[]>,
    timeFrom: OwnTime,
    timeTo: OwnTime,
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    const item = event.previousContainer.data[event.previousIndex];
    event.previousContainer.data.splice(event.previousIndex, 1);

    this.shiftOpsService.arrangeAndSetItems(
      [...event.previousContainer.data],
      timeFrom,
      timeTo,
      selectedWeekday,
      isHoliday,
    );

    const selectedIdentifier =
      this.shiftService.selectedShift?.id ||
      this.shiftService.selectedShift?.tmpId;
    const itemIdentifier = item.id || item.tmpId;
    if (selectedIdentifier === itemIdentifier) {
      this.shiftService.setSelectedShift(null);
    }
  }
}
