// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Runs one editing session of the container template: initializes the page, acquires the container lock,
 * loads the routed container with its grid, tasks and templates, and tears everything down again. While it runs,
 * a refresh target is registered so a Klacksy change to container templates reloads the edited weekday (tasks,
 * templates, bases, route info); unsaved edits make the DataRefreshCoordinator ask first, and a lost lock is
 * acquired again once per reload (read-only with a notice when someone else holds it).
 * @param destroy$ - Emits once when the session ends; every session-bound subscription completes with it
 * @param loadedTasks - The weekday items map as loaded last; a different map means the user changed items locally
 */
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, Observable, Subject, Subscription, switchMap, takeUntil, tap } from 'rxjs';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerLockService } from 'src/app/domain/services/container/container-lock.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { IWeekdayContainerTemplateItemsMap } from 'src/app/domain/services/container/weekday-container-template-items-map.interface';
import { DataRefreshRegistry } from 'src/app/application/services/data-refresh-registry.service';
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
import { ContainerTemplateRefreshTarget } from './container-template-refresh-target';

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
  private shiftService = inject(ContainerTemplateShiftService);
  private refreshRegistry = inject(DataRefreshRegistry);

  readonly destroy$ = new Subject<void>();

  private readonly refreshTarget = new ContainerTemplateRefreshTarget({
    isDirty: () => this.hasLocalChanges(),
    save: () => this.containerService.save(),
    reload: () => this.reload(),
  });
  private unregisterRefresh: (() => void) | null = null;
  private reloadSubscription: Subscription | null = null;
  private loadedTasks: IWeekdayContainerTemplateItemsMap | null = null;
  private stopped = false;

  start(): void {
    this.lifecycleService.initialize();
    this.lifecycleService.registerSaveCompletedCallback(
      () => this.state.containerShift,
      () => this.state.selectedWeekday,
      () => this.state.isHoliday,
      () => this.onReloaded(),
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
    this.unregisterRefresh = this.refreshRegistry.register(this.refreshTarget);
  }

  stop(): void {
    this.stopped = true;
    this.unregisterRefresh?.();
    this.unregisterRefresh = null;
    this.reloadSubscription?.unsubscribe();
    this.reloadSubscription = null;
    this.lifecycleService.clearSaveCompletedCallback();
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
    this.markClean();
    this.viewRefresh.markForCheck();
  }

  private reload(): void {
    const containerId = this.state.containerShift?.id;
    if (this.stopped || !containerId) return;

    this.reacquireLockIfLost(containerId);
    this.reloadSubscription?.unsubscribe();
    this.reloadSubscription = this.loadTasksAndTemplatesForWeekday()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.onReloaded(),
        error: () => this.onShiftLoadFailed(),
      });
  }

  private onReloaded(): void {
    this.viewRefresh.refreshSelection();
    this.markClean();
  }

  private reacquireLockIfLost(containerId: string): void {
    if (this.state.isReadOnly || this.lockService.currentLock()?.acquired) return;

    this.acquireLock(containerId);
  }

  private markClean(): void {
    this.loadedTasks = this.shiftService.getAllWeekdayTasks();
  }

  private hasLocalChanges(): boolean {
    const itemsChanged = this.loadedTasks !== null && this.shiftService.getAllWeekdayTasks() !== this.loadedTasks;
    return itemsChanged || this.containerService.areObjectsDirty();
  }

  private onShiftLoadFailed(): void {
    this.state.isLoading = false;
    this.viewRefresh.markForCheck();
  }
}
