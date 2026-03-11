// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service zur Verwaltung der Filter-Parameter für Client-Availability.
 * @param searchString - Aktueller Suchbegriff
 * @param selectedGroupId - Aktive Gruppen-Selektion
 */
import { Injectable, signal } from '@angular/core';
import { IClientAvailabilityClientFilter } from 'src/app/domain/models/client-availability/client-availability-client-filter.interface';

const ALL_GROUPS_VIRTUAL_ID = 'all-groups-virtual';

@Injectable()
export class ClientAvailabilityFilterService {
  public searchString = '';
  public selectedGroupId: string | undefined;
  public clientsChanged = signal(false);

  public clientFilter = {
    orderBy: 'name',
    sortOrder: 'asc',
    showEmployees: true,
    showExtern: true,
    hoursSortOrder: undefined as string | undefined,
  };

  public startDate = '';
  public endDate = '';

  public buildFilter(startRow = 0, rowCount = 200): IClientAvailabilityClientFilter {
    return {
      searchString: this.searchString,
      startDate: this.startDate,
      endDate: this.endDate,
      selectedGroup: this.selectedGroupId && this.selectedGroupId !== ALL_GROUPS_VIRTUAL_ID
        ? this.selectedGroupId
        : undefined,
      orderBy: this.clientFilter.orderBy,
      sortOrder: this.clientFilter.sortOrder,
      showEmployees: this.clientFilter.showEmployees,
      showExtern: this.clientFilter.showExtern,
      startRow,
      rowCount,
    };
  }

  public notifyClientsChanged(): void {
    this.clientsChanged.set(true);
    setTimeout(() => this.clientsChanged.set(false), 100);
  }
}
