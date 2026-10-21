// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Keeps the container template view in sync: bridges the search, dirty, grid and reset signals into the
 * editor state and refreshes the available tasks, the current slot and the start/end base after a change.
 * @param state - Editor state the refreshes read the weekday, holiday flag, grid and search filter from
 * @param tabService - Owns the selected tab and the filtered available tasks
 */
import { ChangeDetectorRef, Injectable, Injector, computed, effect, inject } from '@angular/core';
import { IContainerTemplateSlot } from 'src/app/domain/models/container/container-template-slot';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { ContainerTemplateEditorStateService } from './container-template-editor-state.service';
import { ContainerTemplateTabService } from './container-template-tab.service';
import { ContainerTemplateRouteService } from './container-template-route.service';
import { ContainerTemplateLifecycleService } from './container-template-lifecycle.service';

@Injectable()
export class ContainerTemplateViewRefreshService {
  private state = inject(ContainerTemplateEditorStateService);
  private tabService = inject(ContainerTemplateTabService);
  private routeService = inject(ContainerTemplateRouteService);
  private lifecycleService = inject(ContainerTemplateLifecycleService);
  private containerService = inject(DataManagementContainerService);
  private shiftService = inject(ContainerTemplateShiftService);
  private sortingService = inject(TableSortingService);
  private cdr = inject(ChangeDetectorRef);
  private injector = inject(Injector);

  private isDirty = computed(() => {
    const hasSelectedTasks = this.shiftService.selectedContainerTemplateItemsSignal().length > 0;
    const hasTemplateChanges = this.containerService.areObjectsDirty();
    return hasSelectedTasks || hasTemplateChanges;
  });

  private canSave = computed(() => {
    const hasSelectedTasks = this.shiftService.selectedContainerTemplateItemsSignal().length > 0;
    const canSaveTemplates = this.containerService.canSave();
    return hasSelectedTasks || canSaveTemplates;
  });

  /**
   * Registers the effects in their load-bearing order: search, dirty bridge to the save bar, grid, reset.
   * Must be called from the component constructor so the effects belong to the component view.
   */
  connect(): void {
    this.connectSearch();
    this.connectDirtyBridge();
    this.connectTemplateGrid();
    this.connectReset();
  }

  markForCheck(): void {
    this.cdr.markForCheck();
  }

  updateAvailableTasks(): void {
    this.tabService.updateAvailableTasks(
      this.state.selectedWeekday,
      this.state.isHoliday,
      this.state.templateGrid,
      this.state.searchString,
      this.state.includeAddress,
    );
  }

  refreshAvailableTasks(): void {
    this.updateAvailableTasks();
    this.markForCheck();
  }

  refreshSelection(): void {
    this.updateAvailableTasks();
    this.updateCurrentWeekdayAndSlot();
    this.routeService.loadStartEndBaseForCurrentTemplate(this.state.selectedWeekday, this.state.isHoliday);
    this.markForCheck();
  }

  sortBy(columnKey: string): void {
    this.sortingService.onHeaderClick(columnKey, () => this.refreshAvailableTasks());
  }

  getFilteredRowsForSelectedWeekday(): IContainerTemplateSlot[][] {
    return this.tabService.getFilteredRowsForSelectedWeekday(
      this.state.selectedWeekday,
      this.state.isHoliday,
      this.state.templateGrid,
    );
  }

  getTabLabel(rowIndex: number): string {
    return this.tabService.getTabLabel(
      rowIndex,
      this.state.selectedWeekday,
      this.state.isHoliday,
      this.state.templateGrid,
    );
  }

  private updateCurrentWeekdayAndSlot(): void {
    const weekdayNumber = this.state.selectedWeekdayNumber();
    if (weekdayNumber === null) return;

    const slots = this.getFilteredRowsForSelectedWeekday()[this.tabService.selectedTabIndex] ?? [];
    if (slots.length > 0) {
      this.containerService.setCurrentWeekdayAndSlot(weekdayNumber, slots[0]);
    }
  }

  private connectSearch(): void {
    effect(() => {
      const searchString = this.lifecycleService.searchStateService.containerTemplateSearch();
      const includeAddress = this.lifecycleService.searchStateService.containerTemplateIncludeAddress();
      if (!this.state.applySearch(searchString, includeAddress)) return;

      this.refreshAvailableTasks();
    }, { injector: this.injector });
  }

  private connectDirtyBridge(): void {
    effect(() => {
      this.isDirty();
      this.canSave();
      this.lifecycleService.workplaceStateService.areObjectsDirty();
    }, { injector: this.injector });
  }

  private connectTemplateGrid(): void {
    effect(() => {
      this.state.templateGrid = this.containerService.templateGrid();
      this.state.isLoading = this.containerService.loading();
      this.markForCheck();
    }, { injector: this.injector });
  }

  private connectReset(): void {
    effect(() => {
      if (!this.containerService.isReset()) return;
      this.updateAvailableTasks();
      this.markForCheck();
    }, { injector: this.injector });
  }
}
