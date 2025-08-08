import { inject } from '@angular/core';
import { WorkplaceStateService } from 'src/app/workplace/core/workplace-state.service';
import { SearchService } from 'src/app/services/search.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { SearchStateService } from 'src/app/services/search-state.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { RouteName } from 'src/app/domain/models/entity-names.enum';
import {
  cloneObject,
  compareComplexObjects,
  copyObjectValues,
} from 'src/app/helpers/object-helpers';
import { IBaseFilter } from 'src/app/domain/models/general-class';
import { IFilterStorage, FILTER_STORAGE_TOKEN } from 'src/app/application/interfaces/filter-storage.interface';

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
  protected filterStorage = inject(FILTER_STORAGE_TOKEN);

  protected lastSavedFilter: T | null = null;

  constructor(
    protected dataManagementService: S,
    protected routeName: RouteName,
    protected editRouteName: string
  ) {}

  async initializeWorkplaceState(): Promise<void> {
    this.workplaceStateService.setActiveManagerByRoute(this.routeName);
    this.searchService.setSearchVisibility(true);

    this.dataManagementService.onExternalFilterChange = () => {
      this.onSearchFilterChanged();
    };

    await this.restoreFilterFromStorage();
  }

  async saveCurrentFilter(key = this.editRouteName): Promise<void> {
    const storedRowOrder = this.localStorageService.get(
      MessageLibrary.SELECTED_ROW_ORDER
    );
    const isAutoMode = storedRowOrder === '-1';

    this.lastSavedFilter = cloneObject(
      this.dataManagementService.currentFilter
    );

    try {
      if (isAutoMode) {
        const filterToSave = cloneObject(
          this.dataManagementService.currentFilter
        );
        await this.filterStorage.saveFilter(key, filterToSave);
      } else {
        await this.filterStorage.saveFilter(key, this.dataManagementService.currentFilter);
      }
    } catch (error) {
      console.error('Failed to save filter:', error);
    }
  }

  async restoreFilterFromStorage(key = this.editRouteName): Promise<boolean> {
    try {
      const storedFilter = await this.filterStorage.restoreFilter<T>(key);

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

      const wasApplied = this.applyStoredFilter(storedFilter);
      if (wasApplied) {
        this.lastSavedFilter = cloneObject(storedFilter);
      }
      return wasApplied;
    } catch (error) {
      console.error('Failed to restore filter:', error);
      this.searchStateService.clearRestoreSearch();
      this.lastSavedFilter = null;
      return false;
    }
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


  async clearStoredFilter(key = this.editRouteName): Promise<void> {
    try {
      await this.filterStorage.removeFilter(key);
      this.lastSavedFilter = null;
    } catch (error) {
      console.error('Failed to clear filter:', error);
    }
  }

  onSearchFilterChanged(): void {
    // Clear stored filter asynchronously without waiting
    this.clearStoredFilter().catch(error => 
      console.error('Failed to clear filter after search change:', error)
    );
    this.updateFilterState();
  }

  isResizeCalculationAllowed(): boolean {
    return !this.dataManagementService.currentFilter.searchString?.trim();
  }
}