// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Facade service for initialization, lifecycle, and search state of the container template component.
 * @param layoutService - Sets the container size on initialization
 * @param savebarService - Controls the visibility of the save bar
 * @param searchService - Controls the visibility of the search bar
 * @param searchStateService - Provides the current search string and address flag
 * @param workplaceStateService - Sets active manager and entity name, checks dirty state
 * @param appSettingsService - Loads app settings on init
 * @param branchService - Loads branches on init
 * @param activatedRoute - Provides route parameters (container shift ID)
 * @param dataShiftService - Loads shift data via API
 */
import { Injectable, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject, map, switchMap } from 'rxjs';
import { takeUntil } from 'rxjs';
import { SearchService } from 'src/app/application/services/search.service';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { EntityName, RouteName } from 'src/app/domain/enums/entity-names.enum';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { BranchManagementService } from 'src/app/domain/services/settings/branch-management.service';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { IShift } from 'src/app/domain/models/shift/shift-class';

@Injectable()
export class ContainerTemplateLifecycleService {
  private layoutService = inject(LayoutService);
  private savebarService = inject(SavebarService);
  private searchService = inject(SearchService);
  readonly searchStateService = inject(SearchStateService);
  readonly workplaceStateService = inject(WorkplaceStateService);
  private appSettingsService = inject(AppSettingsManagementService);
  private branchService = inject(BranchManagementService);
  private activatedRoute = inject(ActivatedRoute);
  private dataShiftService = inject(DataShiftService);
  private containerService = inject(DataManagementContainerService);

  initialize(): void {
    this.layoutService.setContainerToNormalSize();
    this.workplaceStateService.setActiveManagerByRoute(
      RouteName.CONTAINER_TEMPLATE,
    );
    this.workplaceStateService.setNameOfVisibleEntity(
      EntityName.SHIFT_CONTAINER_TEMPLATE,
    );
    this.searchService.setSearchVisibility(true);
    this.savebarService.setSavebarVisibility(true);
    this.appSettingsService.loadSettings();
    this.branchService.loadBranches();
  }

  observeRouteParams(destroy$: Subject<void>): Observable<string> {
    return this.activatedRoute.params.pipe(
      takeUntil(destroy$),
      map((params) => params['id'] as string),
    );
  }

  loadShift(id: string): Observable<IShift> {
    return this.dataShiftService.getShift(id);
  }

  registerSaveCompletedCallback(
    getContainerShift: () => IShift | null,
    getSelectedWeekday: () => string | null,
    getIsHoliday: () => boolean,
    onReloaded: () => void,
  ): void {
    this.containerService.onSaveCompleted = () => {
      const containerShift = getContainerShift();
      const selectedWeekday = getSelectedWeekday();
      if (containerShift?.id && selectedWeekday) {
        const weekdayNumber = this.containerService.getWeekdayNumber(selectedWeekday);

        this.containerService
          .loadTasksForWeekday(weekdayNumber)
          .pipe(
            switchMap(() =>
              this.containerService.loadTemplates(containerShift.id!),
            ),
          )
          .subscribe(() => onReloaded());
      }
    };
  }

  markDirty(): void {
    this.workplaceStateService.areObjectsDirty();
  }
}
