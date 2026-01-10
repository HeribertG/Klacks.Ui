import { Injectable, inject } from '@angular/core';
import { BaseEntitySearchStrategy } from './base-entity-search-strategy';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { EntitySearchOptions } from './interfaces/entity-search-strategy.interface';

@Injectable({
  providedIn: 'root'
})
export class ShiftSearchStrategy extends BaseEntitySearchStrategy {
  protected dataManagementService: DataManagementShiftService = inject(DataManagementShiftService);
  protected entityName = EntityName.SHIFT;

  override search(value: string, options: EntitySearchOptions = {}): void {
    this.dataManagementService.currentFilter.searchString = value;
    this.dataManagementService.currentFilter.includeClientName = options.includeClient ?? false;
    this.triggerExternalFilterChange();
    this.refreshData();
  }

  protected refreshData(): void {
    this.dataManagementService.readPage();
  }
}