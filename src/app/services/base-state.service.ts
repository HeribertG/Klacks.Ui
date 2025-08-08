import { inject } from '@angular/core';
import { WorkplaceStateService } from 'src/app/workplace/core/workplace-state.service';
import { SearchService } from 'src/app/services/search.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { SearchStateService } from 'src/app/services/search-state.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { RouteName } from 'src/app/data/management/entity-names.enum';
import {
  cloneObject,
  compareComplexObjects,
  copyObjectValues,
  restoreFilter,
  saveFilter,
} from 'src/app/helpers/object-helpers';
import { IBaseFilter } from 'src/app/core/general-class';

export interface IDataManagementService<T extends IBaseFilter> {
  currentFilter: T;
  onExternalFilterChange?: () => void;
  restoreSearch: { set(value: string): void };
}

export abstract class BaseStateService<T extends IBaseFilter, S extends IDataManagementService<T>> {
  protected workplaceStateService = inject(WorkplaceStateService);
  protected searchService = inject(SearchService);
  protected localStorageService = inject(LocalStorageService);
  protected searchStateService = inject(SearchStateService);

  protected lastSavedFilter: T | null = null;

  constructor(
    protected dataManagementService: S,
    protected routeName: RouteName,
    protected editRouteName: string
  ) {}

  initializeWorkplaceState(): void {
    this.workplaceStateService.setActiveManagerByRoute(this.routeName);
    this.searchService.setSearchVisibility(true);

    this.dataManagementService.onExternalFilterChange = () => {
      this.onSearchFilterChanged();
    };

    this.restoreFilterFromStorage();
  }

  saveCurrentFilter(key = this.editRouteName): void {
    const storedRowOrder = this.localStorageService.get(
      MessageLibrary.SELECTED_ROW_ORDER
    );
    const isAutoMode = storedRowOrder === '-1';

    this.lastSavedFilter = cloneObject(
      this.dataManagementService.currentFilter
    );

    if (isAutoMode) {
      const filterToSave = cloneObject(
        this.dataManagementService.currentFilter
      );
      saveFilter(filterToSave, key);
    } else {
      saveFilter(this.dataManagementService.currentFilter, key);
    }
  }

  restoreFilterFromStorage(key = this.editRouteName): boolean {
    const storedFilter = restoreFilter(key);

    if (!storedFilter) {
      this.searchStateService.clearRestoreSearch();
      this.lastSavedFilter = null;
      return false;
    }

    if (this.hasFilterChanged()) {
      this.lastSavedFilter = cloneObject(
        this.dataManagementService.currentFilter
      );
      return false;
    }

    const wasApplied = this.applyStoredFilter(storedFilter as T);
    if (wasApplied) {
      this.lastSavedFilter = cloneObject(storedFilter) as T;
    }
    return wasApplied;
  }

  protected applyStoredFilter(storedFilter: T): boolean {
    const originalFilter = cloneObject<T>(
      this.dataManagementService.currentFilter
    );

    copyObjectValues(
      this.dataManagementService.currentFilter,
      storedFilter
    );

    const searchValue = this.dataManagementService.currentFilter.searchString || '';
    this.searchStateService.setRestoreSearch(searchValue);

    return !compareComplexObjects(
      originalFilter,
      this.dataManagementService.currentFilter
    );
  }

  prepareFilterForRequest(
    orderBy: string,
    sortOrder: string,
    page: number,
    firstItemOnLastPage?: number,
    isPreviousPage?: boolean,
    isNextPage?: boolean
  ): void {
    this.dataManagementService.currentFilter.orderBy = orderBy;
    this.dataManagementService.currentFilter.sortOrder = sortOrder;
    this.dataManagementService.currentFilter.requiredPage = page - 1;
    this.dataManagementService.currentFilter.firstItemOnLastPage =
      firstItemOnLastPage;
    this.dataManagementService.currentFilter.isPreviousPage =
      isPreviousPage;
    this.dataManagementService.currentFilter.isNextPage = isNextPage;
  }

  resetFilter(): void {
    // Filter reset is handled by filter object itself
  }

  protected hasFilterChanged(): boolean {
    if (!this.lastSavedFilter) {
      return false;
    }

    const currentFilter = this.dataManagementService.currentFilter;
    return !compareComplexObjects(this.lastSavedFilter, currentFilter);
  }

  updateFilterState(): void {
    this.lastSavedFilter = cloneObject(
      this.dataManagementService.currentFilter
    );
  }


  clearStoredFilter(key = this.editRouteName): void {
    localStorage.removeItem(key);
    this.lastSavedFilter = null;
  }

  onSearchFilterChanged(): void {
    this.clearStoredFilter();
    this.updateFilterState();
  }

  isResizeCalculationAllowed(): boolean {
    return !this.dataManagementService.currentFilter.searchString?.trim();
  }
}