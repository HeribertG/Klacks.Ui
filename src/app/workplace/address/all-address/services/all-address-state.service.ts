import { Injectable, inject } from '@angular/core';
import { IFilter } from 'src/app/core/client-class';
import { WorkplaceStateService } from 'src/app/data/management/workplace-state.service';
import { DataManagementClientService } from 'src/app/data/management/data-management-client.service';
import { RouteName } from 'src/app/data/management/entity-names.enum';
import { SearchService } from 'src/app/services/search.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import {
  cloneObject,
  compareComplexObjects,
  copyObjectValues,
  restoreFilter,
  saveFilter,
} from 'src/app/helpers/object-helpers';

@Injectable()
export class AllAddressStateService {
  private workplaceStateService = inject(WorkplaceStateService);
  private dataManagementClientService = inject(DataManagementClientService);
  private searchService = inject(SearchService);
  private localStorageService = inject(LocalStorageService);

  private lastSavedFilter: IFilter | null = null;

  initializeWorkplaceState(): void {
    this.workplaceStateService.setActiveManagerByRoute(RouteName.CLIENT);
    this.searchService.setSearchVisibility(true);

    this.dataManagementClientService.onExternalFilterChange = () => {
      this.onSearchFilterChanged();
    };
  }

  saveCurrentFilter(key = RouteName.EDIT_ADDRESS): void {
    const storedRowOrder = this.localStorageService.get(
      MessageLibrary.SELECTED_ROW_ORDER
    );
    const isAutoMode = storedRowOrder === '-1';

    this.lastSavedFilter = cloneObject(
      this.dataManagementClientService.currentFilter
    );

    if (isAutoMode) {
      const filterToSave = cloneObject(
        this.dataManagementClientService.currentFilter
      );
      saveFilter(filterToSave, key);
    } else {
      saveFilter(this.dataManagementClientService.currentFilter, key);
    }
  }

  restoreFilterFromStorage(key = RouteName.EDIT_ADDRESS): boolean {
    const storedFilter = restoreFilter(key);

    if (!storedFilter) {
      this.dataManagementClientService.currentFilter.setEmpty();
      this.lastSavedFilter = null;
      return false;
    }

    if (this.hasFilterChanged()) {
      this.lastSavedFilter = cloneObject(
        this.dataManagementClientService.currentFilter
      );
      return false;
    }

    const wasApplied = this.applyStoredFilter(storedFilter);
    if (wasApplied) {
      this.lastSavedFilter = cloneObject(storedFilter);
    }
    return wasApplied;
  }

  private applyStoredFilter(storedFilter: IFilter): boolean {
    const originalFilter = cloneObject<IFilter>(
      this.dataManagementClientService.currentFilter
    );

    copyObjectValues(
      this.dataManagementClientService.currentFilter,
      storedFilter
    );

    if (this.dataManagementClientService.currentFilter.searchString) {
      this.dataManagementClientService.restoreSearch.set(
        this.dataManagementClientService.currentFilter.searchString
      );
    }

    return !compareComplexObjects(
      originalFilter,
      this.dataManagementClientService.currentFilter
    );
  }

  setTemporaryFilterState(): void {
    this.dataManagementClientService.setTemporaryFilter();
  }

  isTemporaryFilterDirty(): boolean {
    return this.dataManagementClientService.isTemoraryFilter_Dirty();
  }

  prepareFilterForRequest(
    orderBy: string,
    sortOrder: string,
    page: number,
    firstItemOnLastPage?: number,
    isPreviousPage?: boolean,
    isNextPage?: boolean
  ): void {
    this.dataManagementClientService.currentFilter.orderBy = orderBy;
    this.dataManagementClientService.currentFilter.sortOrder = sortOrder;
    this.dataManagementClientService.currentFilter.requiredPage = page - 1;
    this.dataManagementClientService.currentFilter.firstItemOnLastPage =
      firstItemOnLastPage;
    this.dataManagementClientService.currentFilter.isPreviousPage =
      isPreviousPage;
    this.dataManagementClientService.currentFilter.isNextPage = isNextPage;
  }

  resetFilter(): void {
    this.dataManagementClientService.currentFilter.setEmpty();
    this.clearHeaderCheckbox();
  }

  clearHeaderCheckbox(): void {
    this.dataManagementClientService.headerCheckBoxValue = false;
    this.dataManagementClientService.clearCheckedArray();
  }

  updateClientType(clientType: number): void {
    this.dataManagementClientService.currentFilter.clientType = clientType;
    this.clearHeaderCheckbox();
  }

  setShowDeleteEntries(show: boolean): void {
    setTimeout(() => {
      this.dataManagementClientService.editClientDeleted = show;
    }, 100);
  }

  private hasFilterChanged(): boolean {
    if (!this.lastSavedFilter) {
      return false;
    }

    const currentFilter = this.dataManagementClientService.currentFilter;

    return !compareComplexObjects(this.lastSavedFilter, currentFilter);
  }

  updateFilterState(): void {
    this.lastSavedFilter = cloneObject(
      this.dataManagementClientService.currentFilter
    );
  }

  clearStoredFilter(key = RouteName.EDIT_ADDRESS): void {
    localStorage.removeItem(key);
    this.lastSavedFilter = null;
  }

  onSearchFilterChanged(): void {
    this.clearStoredFilter();
    this.updateFilterState();
  }

  isResizeCalculationAllowed(): boolean {
    return !this.dataManagementClientService.currentFilter.searchString?.trim();
  }
}
