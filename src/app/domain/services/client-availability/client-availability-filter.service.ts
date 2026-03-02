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

    return result;
  }

  public applyFilters(): void {
    this.clientsChanged.set(true);
    setTimeout(() => this.clientsChanged.set(false), 100);
  }
}
