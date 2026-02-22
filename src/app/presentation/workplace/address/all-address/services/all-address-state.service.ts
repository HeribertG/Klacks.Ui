// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { IFilter } from 'src/app/domain/models/client/client-class';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { BaseStateService } from 'src/app/application/services/base-state.service';

@Injectable()
export class AllAddressStateService extends BaseStateService<IFilter, DataManagementClientService> {
  constructor() {
    super(
      inject(DataManagementClientService),
      RouteName.CLIENT,
      RouteName.EDIT_ADDRESS
    );
  }

  // Address-specific methods

  updateClientType(clientType: number): void {
    this.dataManagementService.currentFilter.clientType = clientType;
  }

  setShowDeleteEntries(show: boolean): void {
    setTimeout(() => {
      this.dataManagementService.editClientDeleted.set(show);
    }, 100);
  }
}
