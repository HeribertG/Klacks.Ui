// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal } from '@angular/core';
import { IAvailabilityClient } from 'src/app/domain/models/client-availability/availability-client.interface';
import { IClientTypeFilter } from 'src/app/presentation/shared/client-filter/client-filter.interface';

const ALL_GROUPS_VIRTUAL_ID = 'all-groups-virtual';

@Injectable()
export class ClientAvailabilityFilterService implements IClientTypeFilter {
  private allClients: IAvailabilityClient[] = [];

  public searchString = '';
  public selectedGroupId: string | undefined;
  public clientsChanged = signal(false);

  public orderBy = 'name';
  public sortOrder = 'asc';
  public showEmployees = true;
  public showExtern = true;
  public hoursSortOrder: string | undefined = undefined;

  public setAllClients(clients: IAvailabilityClient[]): void {
    this.allClients = clients;
  }

  public getFilteredClients(): IAvailabilityClient[] {
    let result = this.allClients;

    if (this.searchString) {
      const term = this.searchString.toLowerCase();
      result = result.filter((c) =>
        c.displayName.toLowerCase().includes(term)
      );
    }

    if (
      this.selectedGroupId &&
      this.selectedGroupId !== ALL_GROUPS_VIRTUAL_ID
    ) {
      result = result.filter((c) =>
        c.groupIds.includes(this.selectedGroupId!)
      );
    }

    if (!this.showEmployees) {
      result = result.filter((c) => c.legalEntity);
    }

    if (!this.showExtern) {
      result = result.filter((c) => !c.legalEntity);
    }

    result = this.sortClients(result);

    return result;
  }

  public applyFilters(): void {
    this.clientsChanged.set(true);
    setTimeout(() => this.clientsChanged.set(false), 100);
  }

  private sortClients(clients: IAvailabilityClient[]): IAvailabilityClient[] {
    const direction = this.sortOrder === 'asc' ? 1 : -1;

    return [...clients].sort((a, b) => {
      let valueA = '';
      let valueB = '';

      switch (this.orderBy) {
        case 'firstName':
          valueA = a.firstName;
          valueB = b.firstName;
          break;
        case 'company':
          valueA = a.company;
          valueB = b.company;
          break;
        default:
          valueA = a.name;
          valueB = b.name;
          break;
      }

      return valueA.localeCompare(valueB) * direction;
    });
  }
}
