import { inject, Injectable, signal } from '@angular/core';
import { EntityName } from './entity-names.enum';
import { WorkplaceStateService } from './workplace-state.service';
import { DataManagementClientService } from './data-management-client.service';
import { DataManagementBreakService } from './data-management-break.service';
import { DataManagementGroupService } from './data-management-group.service';
import { DataManagementScheduleService } from './data-management-schedule.service';
import { DataManagementShiftService } from './data-management-shift.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementSearchService {
  private dataManagementSwitchboard = inject(WorkplaceStateService);
  private dataManagementClient = inject(DataManagementClientService);
  private dataManagementBreak = inject(DataManagementBreakService);
  private dataManagementGroup = inject(DataManagementGroupService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private dataManagementShift = inject(DataManagementShiftService);

  private _restoreSearch = signal('');

  public globalSearch(
    value: string,
    isIncludeAddress = false,
    isIncludeClient = false
  ): void {
    this._restoreSearch.set(value);
    switch (this.dataManagementSwitchboard.nameOfVisibleEntity()) {
      case EntityName.CLIENT:
        this.dataManagementClient.currentFilter.searchString = value;
        this.dataManagementClient.currentFilter.includeAddress =
          isIncludeAddress;
        if (this.dataManagementClient.onExternalFilterChange) {
          this.dataManagementClient.onExternalFilterChange();
        }
        this.dataManagementClient.readPage();
        break;
      case EntityName.GROUP:
        this.dataManagementGroup.currentFilter.searchString = value;
        this.dataManagementGroup.readPage();
        break;
      case EntityName.ABSENCE:
        this.dataManagementBreak.breakFilter.searchString = value;
        this.dataManagementBreak.readYear();
        if (this.dataManagementBreak.onExternalFilterChange) {
          this.dataManagementBreak.onExternalFilterChange();
        }
        break;
      case EntityName.SCHEDULE:
        this.dataManagementSchedule.workFilter.searchString = value;
        this.dataManagementSchedule.readDatas();
        if (this.dataManagementSchedule.onExternalFilterChange) {
          this.dataManagementSchedule.onExternalFilterChange();
        }
        break;
      case EntityName.SHIFT:
        this.dataManagementShift.currentFilter.searchString = value;
        this.dataManagementShift.currentFilter.includeClientName =
          isIncludeClient;
        this.dataManagementShift.readPage();
        break;
    }
  }

  public resetFilter(): void {
    this._restoreSearch.set('');
    this.resetFilterWithoutSignalWrite();
  }

  public resetFilterWithoutSignalWrite(): void {
    switch (this.dataManagementSwitchboard.nameOfVisibleEntity()) {
      case EntityName.CLIENT:
        this.dataManagementClient.currentFilter.searchString = '';
        this.dataManagementClient.currentFilter.includeAddress = false;

        if (this.dataManagementClient.onExternalFilterChange) {
          this.dataManagementClient.onExternalFilterChange();
        }
        this.dataManagementClient.readPage();
        break;
      case EntityName.GROUP:
        this.dataManagementGroup.currentFilter.searchString = '';
        this.dataManagementGroup.readPage();
        break;
      case EntityName.ABSENCE:
        this.dataManagementBreak.breakFilter.searchString = '';
        this.dataManagementBreak.readYear();
        break;
      case EntityName.SCHEDULE:
        this.dataManagementSchedule.workFilter.searchString = '';
        this.dataManagementSchedule.readDatas();
        break;
      case EntityName.SHIFT:
        this.dataManagementShift.currentFilter.searchString = '';
        this.dataManagementShift.currentFilter.includeClientName = false;
        this.dataManagementShift.readPage();
        break;
    }
  }

  public restoreSearch(): string {
    return this._restoreSearch();
  }

  public setRestoreSearch(value: string): void {
    this._restoreSearch.set(value);
  }
}
