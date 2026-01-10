/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, inject } from '@angular/core';
import { BaseEntitySearchStrategy } from './base-entity-search-strategy';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { EntitySearchOptions } from './interfaces/entity-search-strategy.interface';

@Injectable({
  providedIn: 'root',
})
export class GroupSearchStrategy extends BaseEntitySearchStrategy {
  protected dataManagementService: DataManagementGroupService = inject(
    DataManagementGroupService
  );
  protected entityName = EntityName.GROUP;

  override search(value: string, options: EntitySearchOptions = {}): void {
    this.dataManagementService.currentFilter.searchString = value;
    this.triggerExternalFilterChange();
    this.refreshData();
  }

  protected refreshData(): void {
    this.dataManagementService.readPage();
  }
}
