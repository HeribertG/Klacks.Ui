import { inject, Injectable, signal } from '@angular/core';
import { DataManagementSwitchboardService } from './data-management-switchboard.service';
import { DataManagementClientService } from './data-management-client.service';
import { DataManagementBreakService } from './data-management-break.service';
import { DataManagementGroupService } from './data-management-group.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementSearchService {
  private dataManagementSwitchboard = inject(DataManagementSwitchboardService);
  private dataManagementClient = inject(DataManagementClientService);
  private dataManagementBreak = inject(DataManagementBreakService);
  private dataManagementGroup = inject(DataManagementGroupService);

  private _restoreSearch = signal('');

  public globalSearch(value: string, isIncludeAddress: boolean = false): void {
    this._restoreSearch.set(value);
    switch (this.dataManagementSwitchboard.nameOfVisibleEntity) {
      case 'DataManagementClientService':
        this.dataManagementClient.currentFilter.searchString = value;
        this.dataManagementClient.currentFilter.includeAddress =
          isIncludeAddress;
        this.dataManagementClient.readPage();
        break;
      case 'DataManagementBreakService':
        this.dataManagementBreak.breakFilter.search = value;
        this.dataManagementBreak.readYear();
        break;
      case 'DataManagementGroupService':
        this.dataManagementGroup.currentFilter.searchString = value;
        this.dataManagementGroup.readPage();
        break;
    }
  }

  public resetFilter(): void {
    this._restoreSearch.set('');
    this.resetFilterWithoutSignalWrite();
  }

  public resetFilterWithoutSignalWrite(): void {
    switch (this.dataManagementSwitchboard.nameOfVisibleEntity) {
      case 'DataManagementClientService':
        this.dataManagementClient.currentFilter.searchString = '';
        this.dataManagementClient.currentFilter.includeAddress = false;
        this.dataManagementClient.readPage();
        break;
      case 'DataManagementBreakService':
        this.dataManagementBreak.breakFilter.search = '';
        this.dataManagementBreak.readYear();
        break;
      case 'DataManagementGroupService':
        this.dataManagementGroup.currentFilter.searchString = '';
        this.dataManagementGroup.readPage();
        break;
    }
  }

  public restoreSearch(): string {
    return this._restoreSearch();
  }
}
