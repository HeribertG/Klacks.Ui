import { inject, Injectable, signal } from '@angular/core';
import { EntityName } from './entity-names.enum';
import { DataManagementSwitchboardService } from './data-management-switchboard.service';
import { DataManagementClientService } from './data-management-client.service';
import { DataManagementBreakService } from './data-management-break.service';
import { DataManagementGroupService } from './data-management-group.service';
import { DataManagementScheduleService } from './data-management-schedule.service';
import { DataManagementShiftService } from './data-management-shift.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementSearchService {
  private dataManagementSwitchboard = inject(DataManagementSwitchboardService);
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
        this.dataManagementClient.readPage();
        break;
      case EntityName.ABSENCE:
        this.dataManagementBreak.breakFilter.search = value;
        this.dataManagementBreak.readYear();
        break;
      case EntityName.GROUP:
        this.dataManagementGroup.currentFilter.searchString = value;
        this.dataManagementGroup.readPage();
        break;
      case EntityName.SCHEDULE:
        this.dataManagementSchedule.workFilter.search = value;
        this.dataManagementSchedule.readDatas();
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
        this.dataManagementClient.readPage();
        break;
      case EntityName.ABSENCE:
        this.dataManagementBreak.breakFilter.search = '';
        this.dataManagementBreak.readYear();
        break;
      case EntityName.GROUP:
        this.dataManagementGroup.currentFilter.searchString = '';
        this.dataManagementGroup.readPage();
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
}
