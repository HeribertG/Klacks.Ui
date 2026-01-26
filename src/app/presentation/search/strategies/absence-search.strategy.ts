/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, inject } from '@angular/core';
import { BaseEntitySearchStrategy } from './base-entity-search-strategy';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { EntitySearchOptions } from './interfaces/entity-search-strategy.interface';

@Injectable({
  providedIn: 'root',
})
export class AbsenceSearchStrategy extends BaseEntitySearchStrategy {
  protected dataManagementService: DataManagementBreakPlaceholderService = inject(
    DataManagementBreakPlaceholderService
  );
  protected entityName = EntityName.ABSENCE;

  override search(value: string, options: EntitySearchOptions = {}): void {
    this.dataManagementService.breakFilter.searchString = value;
    this.triggerExternalFilterChange();
    this.refreshData();
  }

  protected refreshData(): void {
    this.dataManagementService.readYear();
  }

  override resetFilter(): void {
    this.dataManagementService.breakFilter.searchString = '';
    this.refreshData();
  }
}
