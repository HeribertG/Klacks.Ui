// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Edits the time window (from/until) of the container template: writes it to the selected weekday template,
 * recalculates the duration and rebuilds the template grid once the input has settled.
 * @param state - Editor state holding the time window, the selection and the loaded container
 */
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, Subject, debounceTime, switchMap, takeUntil } from 'rxjs';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { timeToString } from 'src/app/shared/helpers/time-format.helper';
import { CONTAINER_TEMPLATE_TIME_CHANGE_DEBOUNCE_MS } from '../container-template.constants';
import { ContainerTemplateEditorStateService } from './container-template-editor-state.service';
import { ContainerTemplateLifecycleService } from './container-template-lifecycle.service';
import { ContainerTemplateShiftOperationsService } from './container-template-shift-operations.service';
import { ContainerTemplateViewRefreshService } from './container-template-view-refresh.service';

const TIME_SEPARATOR = ':';

@Injectable()
export class ContainerTemplateTimeWindowService {
  private state = inject(ContainerTemplateEditorStateService);
  private containerService = inject(DataManagementContainerService);
  private lifecycleService = inject(ContainerTemplateLifecycleService);
  private shiftOpsService = inject(ContainerTemplateShiftOperationsService);
  private viewRefresh = inject(ContainerTemplateViewRefreshService);
  private timeChange$ = new Subject<void>();

  /**
   * @param destroy$ - Ends the debounced grid refresh together with the editor session
   */
  connect(destroy$: Subject<void>): void {
    this.timeChange$
      .pipe(debounceTime(CONTAINER_TEMPLATE_TIME_CHANGE_DEBOUNCE_MS), takeUntil(destroy$))
      .subscribe(() => this.refreshGrid());
  }

  applyShiftTimes(shift: IShift): void {
    if (shift.startShift && shift.endShift) {
      const [startHours, startMinutes] = shift.startShift.split(TIME_SEPARATOR);
      const [endHours, endMinutes] = shift.endShift.split(TIME_SEPARATOR);

      this.state.timeFrom = OwnTime.forTime(startHours, startMinutes);
      this.state.timeTo = OwnTime.forTime(endHours, endMinutes);
      this.recalculateDuration();
    }
  }

  recalculateDuration(): void {
    this.state.duration = this.shiftOpsService.calculateDuration(this.state.timeFrom, this.state.timeTo);
  }

  onTimeFromChange(time: OwnTime): void {
    this.state.timeFrom = OwnTime.forTime(time.hours, time.minutes);
    this.recalculateDuration();
    this.writeToSelectedTemplate(this.state.timeFrom, (weekday, isHoliday, value) =>
      this.containerService.updateFromTime(weekday, isHoliday, value),
    );
    this.timeChange$.next();
  }

  onTimeToChange(time: OwnTime): void {
    this.state.timeTo = OwnTime.forTime(time.hours, time.minutes);
    this.recalculateDuration();
    this.writeToSelectedTemplate(this.state.timeTo, (weekday, isHoliday, value) =>
      this.containerService.updateUntilTime(weekday, isHoliday, value),
    );
    this.timeChange$.next();
  }

  private writeToSelectedTemplate(
    time: OwnTime,
    write: (weekdayNumber: number, isHoliday: boolean, value: string) => void,
  ): void {
    const weekdayNumber = this.state.selectedWeekdayNumber();
    if (weekdayNumber === null) return;

    write(weekdayNumber, this.state.isHoliday, toTimeString(time));
    this.lifecycleService.markDirty();
  }

  private refreshGrid(): void {
    const containerShift = this.state.containerShift;
    if (!containerShift) return;

    const updatedShift: IShift = {
      ...containerShift,
      startShift: toTimeString(this.state.timeFrom),
      endShift: toTimeString(this.state.timeTo),
    };

    this.containerService
      .initializeTemplateGrid(updatedShift)
      .pipe(switchMap(() => this.loadSelectedWeekdayTasks()))
      .subscribe({
        next: () => this.viewRefresh.refreshAvailableTasks(),
        error: () => this.viewRefresh.markForCheck(),
      });
  }

  private loadSelectedWeekdayTasks(): Observable<unknown> {
    const weekdayNumber = this.state.selectedWeekdayNumber();
    return weekdayNumber === null ? EMPTY : this.containerService.loadTasksForWeekday(weekdayNumber);
  }
}

function toTimeString(time: OwnTime): string {
  return timeToString(parseInt(time.hours), parseInt(time.minutes));
}
