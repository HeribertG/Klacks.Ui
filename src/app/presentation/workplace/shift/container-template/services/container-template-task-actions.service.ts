// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Actions on the selected tasks of the container template: drop, remove, autofill, route optimization,
 * compaction and PDF exports, each run against the current editor state.
 * @param state - Editor state supplying container, weekday, holiday flag, time window and tolerance
 * @param session - Supplies the session end signal for long-running autofill and route requests
 */
import { Injectable, inject } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { resolveContainerHolidaySlot } from 'src/app/domain/helpers/container-holiday-slot.helper';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { ContainerTemplateEditorStateService } from './container-template-editor-state.service';
import { ContainerTemplateSessionService } from './container-template-session.service';
import { ContainerTemplateViewRefreshService } from './container-template-view-refresh.service';
import { ContainerTemplateShiftOperationsService } from './container-template-shift-operations.service';
import { ContainerTemplateRouteService } from './container-template-route.service';
import { ContainerTemplateTabService } from './container-template-tab.service';
import { ContainerTemplateDragDropService } from './container-template-drag-drop.service';

@Injectable()
export class ContainerTemplateTaskActionsService {
  private state = inject(ContainerTemplateEditorStateService);
  private session = inject(ContainerTemplateSessionService);
  private viewRefresh = inject(ContainerTemplateViewRefreshService);
  private shiftOpsService = inject(ContainerTemplateShiftOperationsService);
  private routeService = inject(ContainerTemplateRouteService);
  private tabService = inject(ContainerTemplateTabService);
  private dragDropService = inject(ContainerTemplateDragDropService);
  private shiftService = inject(ContainerTemplateShiftService);

  onTaskDrop(event: CdkDragDrop<IContainerTemplateItem[]>): void {
    this.dragDropService.onTaskDrop(
      event,
      this.state.timeFrom,
      this.state.timeTo,
      this.state.selectedWeekday,
      this.state.isHoliday,
    );
    this.viewRefresh.markForCheck();
  }

  isTimeRangePartial(shift: IShift): boolean {
    return this.shiftOpsService.isTimeRangePartial(shift, this.state.timeFrom, this.state.timeTo);
  }

  removeAllTasks(): void {
    const items = [...this.shiftService.selectedContainerTemplateItemsSignal()];
    for (const item of items) {
      this.shiftOpsService.removeTask(item, this.state.selectedWeekday, this.state.isHoliday, () => {});
    }
    this.viewRefresh.refreshAvailableTasks();
  }

  removeTask(item: IContainerTemplateItem): void {
    this.shiftOpsService.removeTask(
      item,
      this.state.selectedWeekday,
      this.state.isHoliday,
      () => this.viewRefresh.updateAvailableTasks(),
    );
    this.viewRefresh.markForCheck();
  }

  autofill(): void {
    const slot = resolveContainerHolidaySlot(this.state.isHoliday, this.state.containerShift);
    this.routeService.autofill({
      containerShift: this.state.containerShift,
      selectedWeekday: this.state.selectedWeekday,
      isHoliday: slot.isHoliday,
      isWeekdayAndHoliday: slot.isWeekdayAndHoliday,
      timeFrom: this.state.timeFrom,
      timeTo: this.state.timeTo,
      additionalAvailableWorkIds: [],
      timeRangeToleranceValue: this.state.timeRangeToleranceValue,
      destroy$: this.session.destroy$,
      onStateChanged: () => this.viewRefresh.refreshAvailableTasks(),
    }, this.tabService.availableTasks);
  }

  optimizeRoute(): void {
    this.routeService.optimizeRoute(
      this.state.selectedWeekday,
      this.state.isHoliday,
      this.state.timeFrom,
      this.session.destroy$,
      () => this.viewRefresh.refreshAvailableTasks(),
    );
  }

  compactSelectedShifts(keepTravelAndBriefing = false): void {
    this.shiftOpsService.compactSelectedShifts(
      this.state.timeFrom,
      this.state.timeTo,
      this.state.selectedWeekday,
      this.state.isHoliday,
      keepTravelAndBriefing,
    );
    this.viewRefresh.markForCheck();
  }

  exportSelectedShiftsToPdf(): void {
    this.shiftOpsService.exportSelectedShiftsToPdf(
      this.state.containerShift,
      this.state.selectedWeekday,
      this.state.timeFrom,
      this.state.timeTo,
    );
  }

  exportRouteToPdf(): void {
    this.shiftOpsService.exportRouteToPdf(this.state.containerShift, this.state.selectedWeekday, this.state.timeFrom);
  }
}
