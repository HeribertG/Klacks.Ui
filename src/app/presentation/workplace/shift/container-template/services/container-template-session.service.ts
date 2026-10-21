// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Runs one editing session of the container template: initializes the page, acquires the container lock,
 * loads the routed container with its grid, tasks and templates, and tears everything down again.
 * @param destroy$ - Emits once when the session ends; every session-bound subscription completes with it
 */
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, Observable, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerLockService } from 'src/app/domain/services/container/container-lock.service';
import { ContainerLockResourceType } from 'src/app/domain/models/container/container-lock';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import {
  CONTAINER_LOCK_LOCKED_BY_OTHER_KEY,
  CONTAINER_LOCK_LOCKED_BY_SELF_KEY,
  CONTAINER_TEMPLATE_SORTING_CONFIG,
} from '../container-template.constants';
import { ContainerTemplateEditorStateService } from './container-template-editor-state.service';
import { ContainerTemplateLifecycleService } from './container-template-lifecycle.service';
import { ContainerTemplateRouteService } from './container-template-route.service';
import { ContainerTemplateTimeWindowService } from './container-template-time-window.service';
import { ContainerTemplateViewRefreshService } from './container-template-view-refresh.service';

@Injectable()
export class ContainerTemplateSessionService {
  private state = inject(ContainerTemplateEditorStateService);
  private lifecycleService = inject(ContainerTemplateLifecycleService);
  private routeService = inject(ContainerTemplateRouteService);
  private timeWindow = inject(ContainerTemplateTimeWindowService);
  private viewRefresh = inject(ContainerTemplateViewRefreshService);
  private containerService = inject(DataManagementContainerService);
  private lockService = inject(ContainerLockService);
  private sortingService = inject(TableSortingService);
  private toastService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  readonly destroy$ = new Subject<void>();

  start(): void {
    this.lifecycleService.initialize();
    this.lifecycleService.registerSaveCompletedCallback(
      () => this.state.containerShift,
      () => this.state.selectedWeekday,
      () => this.state.isHoliday,
      () => this.viewRefresh.refreshSelection(),
    );
    this.timeWindow.recalculateDuration();
    this.sortingService.initialize(CONTAINER_TEMPLATE_SORTING_CONFIG);

    this.lifecycleService
      .observeRouteParams(this.destroy$)
      .subscribe((id) => {
        if (id) {
          this.loadContainerShift(id);
        }
      });

    this.timeWindow.connect(this.destroy$);
  }

  stop(): void {
    this.lockService.release();
    this.destroy$.next();
    this.destroy$.complete();
    this.containerService.destroy();
  }

  private loadContainerShift(id: string): void {
    this.state.isLoading = true;
    this.acquireLock(id);
    this.lifecycleService
      .loadShift(id)
      .pipe(
        takeUntil(this.destroy$),
        tap((shift) => this.applyLoadedShift(shift)),
        switchMap((shift) => this.containerService.initializeTemplateGrid(shift)),
        switchMap(() => this.loadTasksAndTemplatesForWeekday()),
      )
      .subscribe({
        next: () => this.onShiftLoaded(),
        error: () => this.onShiftLoadFailed(),
      });
  }

  private acquireLock(shiftId: string): void {
    this.lockService
      .acquire(ContainerLockResourceType.containerTemplate, shiftId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lock) => {
          if (lock.acquired) return;

          const key = lock.isSelfConflict ? CONTAINER_LOCK_LOCKED_BY_SELF_KEY : CONTAINER_LOCK_LOCKED_BY_OTHER_KEY;
          const message = this.translateService.instant(key, { user: lock.userName });
          this.toastService.showInfo(message);
          this.state.markReadOnly(message);
          this.viewRefresh.markForCheck();
        },
        error: () => {},
      });
  }

  private applyLoadedShift(shift: IShift): void {
    this.state.containerShift = shift;
    this.timeWindow.applyShiftTimes(shift);
    this.state.applyActiveWeekdays(shift);
  }

  private loadTasksAndTemplatesForWeekday(): Observable<unknown> {
    const weekdayNumber = this.state.selectedWeekdayNumber();
    if (weekdayNumber === null) return EMPTY;

    return this.containerService
      .loadTasksForWeekday(weekdayNumber)
      .pipe(switchMap(() => this.containerService.loadTemplates(this.state.containerShift!.id!)));
  }

  private onShiftLoaded(): void {
    this.state.isLoading = false;
    this.viewRefresh.updateAvailableTasks();
    this.routeService.loadStartEndBaseForCurrentTemplate(this.state.selectedWeekday, this.state.isHoliday);
    this.viewRefresh.markForCheck();
  }

  private onShiftLoadFailed(): void {
    this.state.isLoading = false;
    this.viewRefresh.markForCheck();
  }
}
