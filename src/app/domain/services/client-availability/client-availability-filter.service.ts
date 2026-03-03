// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal } from '@angular/core';
import { IAvailabilityClient } from 'src/app/domain/models/client-availability/availability-client.interface';

const ALL_GROUPS_VIRTUAL_ID = 'all-groups-virtual';

@Injectable()
export class ClientAvailabilityFilterService {
  private allClients: IAvailabilityClient[] = [];

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

    if (!this.clientFilter.showEmployees) {
      result = result.filter((c) => c.legalEntity);
    }

    if (!this.clientFilter.showExtern) {
      result = result.filter((c) => !c.legalEntity);
    }

    result = this.sortClients(result);

    return result;
  }

  public reFilter(updateClients: (clients: IAvailabilityClient[]) => void): void {
    const filtered = this.getFilteredClients();
    updateClients(filtered);
    this.applyFilters();
  }

  public applyFilters(): void {
    this.clientsChanged.set(true);
    setTimeout(() => this.clientsChanged.set(false), 100);
  }

  private sortClients(clients: IAvailabilityClient[]): IAvailabilityClient[] {
    const direction = this.clientFilter.sortOrder === 'asc' ? 1 : -1;

    return [...clients].sort((a, b) => {
      let primaryA = '';
      let primaryB = '';
      let secondaryA = '';
      let secondaryB = '';

      switch (this.clientFilter.orderBy) {
        case 'firstName':
          primaryA = a.firstName;
          primaryB = b.firstName;
          secondaryA = a.name;
          secondaryB = b.name;
          break;
        case 'company':
          primaryA = a.company;
          primaryB = b.company;
          secondaryA = a.name;
          secondaryB = b.name;
          break;
        default:
          primaryA = a.name;
          primaryB = b.name;
          secondaryA = a.firstName;
          secondaryB = b.firstName;
          break;
      }

      const primaryCompare = primaryA.localeCompare(primaryB) * direction;
      if (primaryCompare !== 0) return primaryCompare;
      return secondaryA.localeCompare(secondaryB) * direction;
    });
  }
}
