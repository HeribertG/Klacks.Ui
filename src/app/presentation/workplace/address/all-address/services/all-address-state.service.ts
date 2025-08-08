import { Injectable, inject } from '@angular/core';
import { IFilter } from 'src/app/domain/models/client-class';
import { DataManagementClientService } from 'src/app/domain/services/data-management-client.service';
import { RouteName } from 'src/app/domain/models/entity-names.enum';
import { BaseStateService } from 'src/app/services/base-state.service';

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
      this.dataManagementService.editClientDeleted = show;
    }, 100);
  }
}
