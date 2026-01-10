import { Injectable, inject } from '@angular/core';
import { BaseEntitySearchStrategy } from './base-entity-search-strategy';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { EntitySearchOptions } from './interfaces/entity-search-strategy.interface';

@Injectable({
  providedIn: 'root'
})
export class ClientSearchStrategy extends BaseEntitySearchStrategy {
  protected dataManagementService: DataManagementClientService = inject(DataManagementClientService);
  protected entityName = EntityName.CLIENT;

  override search(value: string, options: EntitySearchOptions = {}): void {
    this.dataManagementService.currentFilter.searchString = value;
    this.dataManagementService.currentFilter.includeAddress = options.includeAddress ?? false;
    
    this.triggerExternalFilterChange();
    this.refreshData();
  }

  protected refreshData(): void {
    this.dataManagementService.readPage();
  }
}