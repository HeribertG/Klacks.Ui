import { Injectable, inject } from '@angular/core';
import { IFilter } from 'src/app/core/client-class';
import { DataManagementClientService } from 'src/app/data/management/data-management-client.service';
import { RouteName } from 'src/app/data/management/entity-names.enum';
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

  // Client-specific implementations

  setTemporaryFilterState(): void {
    this.dataManagementService.setTemporaryFilter();
  }

  isTemporaryFilterDirty(): boolean {
    return this.dataManagementService.isTemoraryFilter_Dirty();
  }

  // Address-specific methods

  updateClientType(clientType: number): void {
    this.dataManagementService.currentFilter.clientType = clientType;
    this.clearHeaderCheckbox();
  }

  setShowDeleteEntries(show: boolean): void {
    setTimeout(() => {
      this.dataManagementService.editClientDeleted = show;
    }, 100);
  }
}
