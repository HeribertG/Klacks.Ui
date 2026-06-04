// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Search strategy for the client/address list.
 * Handles the optional typeFilter option to narrow the Typ-dropdown to a single address type.
 */

import { Injectable, inject } from '@angular/core';
import { BaseEntitySearchStrategy } from './base-entity-search-strategy';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { EntitySearchOptions } from './interfaces/entity-search-strategy.interface';
import { EntityTypeFilter } from 'src/app/domain/constants/entity-type-filter.constants';

@Injectable({
  providedIn: 'root'
})
export class ClientSearchStrategy extends BaseEntitySearchStrategy {
  protected dataManagementService: DataManagementClientService = inject(DataManagementClientService);
  protected entityName = EntityName.CLIENT;

  override search(value: string, options: EntitySearchOptions = {}): void {
    this.dataManagementService.currentFilter.searchString = value;
    this.dataManagementService.currentFilter.includeAddress = options.includeAddress ?? false;

    if (options.typeFilter) {
      this.applyTypeFilter(options.typeFilter);
    }

    this.triggerExternalFilterChange();
    this.refreshData();
  }

  private applyTypeFilter(typeFilter: string): void {
    const isCustomer = typeFilter === EntityTypeFilter.CUSTOMER;
    const isEmployee = typeFilter === EntityTypeFilter.EMPLOYEE;
    const isExtern = typeFilter === EntityTypeFilter.EXTERN;

    this.dataManagementService.currentFilter.customer = isCustomer;
    this.dataManagementService.currentFilter.employee = isEmployee;
    this.dataManagementService.currentFilter.externEmp = isExtern;
  }

  protected refreshData(): void {
    this.dataManagementService.readPage();
  }
}