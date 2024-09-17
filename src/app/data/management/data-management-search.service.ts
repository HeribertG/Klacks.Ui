import { Injectable } from '@angular/core';
import { DataManagementSwitchboardService } from './data-management-switchboard.service';
import { DataManagementClientService } from './data-management-client.service';
import { DataManagementBreakService } from './data-management-break.service';
import { DataManagementGroupService } from './data-management-group.service';
import { Subject, takeUntil } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataManagementSearchService {
  public restoreSearch = new Subject<string>();

  private ngUnsubscribe = new Subject<void>();

  constructor(
    private dataManagementSwitchboard: DataManagementSwitchboardService,
    private dataManagementClient: DataManagementClientService,
    private DataManagementBreak: DataManagementBreakService,
    private dataManagementGroup: DataManagementGroupService
  ) {
    this.dataManagementClient.restoreSearch
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: string) => {
        this.restoreSearch.next(x);
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  public globalSearch(value: string, isIncludeAddress: boolean = false): void {
    switch (this.dataManagementSwitchboard.nameOfVisibleEntity) {
      case 'DataManagementClientService':
        this.dataManagementClient.currentFilter.searchString = value;
        this.dataManagementClient.currentFilter.includeAddress =
          isIncludeAddress;
        this.dataManagementClient.readPage();
        break;
      case 'DataManagementBreakService':
        this.DataManagementBreak.breakFilter.search = value;
        this.DataManagementBreak.readYear();
        break;
      case 'DataManagementGroupService':
        this.dataManagementGroup.currentFilter.searchString = value;
        this.dataManagementGroup.readPage();
        break;
    }
  }

  public resetFilter(): void {
    switch (this.dataManagementSwitchboard.nameOfVisibleEntity) {
      case 'DataManagementClientService':
        this.dataManagementClient.currentFilter.searchString = '';
        this.dataManagementClient.currentFilter.includeAddress = false;
        this.dataManagementClient.readPage();
        break;
      case 'DataManagementBreakService':
        this.DataManagementBreak.breakFilter.search = '';
        this.DataManagementBreak.readYear();
        break;
      case 'DataManagementGroupService':
        this.dataManagementGroup.currentFilter.searchString = '';
        this.dataManagementGroup.readPage();
        break;
    }
  }
}
