/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, inject } from '@angular/core';
import { BaseEntitySearchStrategy } from './base-entity-search-strategy';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { EntityName } from 'src/app/domain/models/entity-names.enum';
import { EntitySearchOptions } from './interfaces/entity-search-strategy.interface';

@Injectable({
  providedIn: 'root',
})
export class ScheduleSearchStrategy extends BaseEntitySearchStrategy {
  protected dataManagementService: DataManagementScheduleService = inject(
    DataManagementScheduleService
  );
  protected entityName = EntityName.SCHEDULE;

  override search(value: string, options: EntitySearchOptions = {}): void {
    this.dataManagementService.workFilter.searchString = value;
    this.triggerExternalFilterChange();
    this.refreshData();
  }

  protected refreshData(): void {
    this.dataManagementService.readDatas();
  }

  override resetFilter(): void {
    this.dataManagementService.workFilter.searchString = '';
    this.refreshData();
  }
}
