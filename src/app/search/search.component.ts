import {
  Component,
  HostListener,
  effect,
  signal,
  computed,
  ChangeDetectorRef,
} from '@angular/core';
import { DataManagementSearchService } from 'src/app/data/management/data-management-search.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchComponent {
  @HostListener('search', ['$event'])
  onsearch(event: KeyboardEvent) {
    this.onClickSearch();
  }

  public faSearch = faSearch;
  public isVisible = false;

  public isIncludeAddress = false;
  public includeAddress = false;
  public searchString = '';

  constructor(
    private dataManagementSwitchboard: DataManagementSwitchboardService,
    private dataManagementSearch: DataManagementSearchService,
    private cdr: ChangeDetectorRef
  ) {
    this.readSignals();
  }

  onClickSearch() {
    this.dataManagementSearch.globalSearch(
      this.searchString,
      this.includeAddress
    );
  }

  onKeyupSearch(event: any) {
    if (event.srcElement && event.srcElement.value.toString() === '') {
      this.onClickSearch();
    }
  }

  private isComponentVisible(): boolean {
    switch (this.dataManagementSwitchboard.nameOfVisibleEntity) {
      case 'DataManagementClientService':
      case 'DataManagementBreakService':
      case 'DataManagementGroupService':
        return true;
    }

    return false;
  }

  private handleFocusChange() {
    this.dataManagementSearch.resetFilter();
    this.searchString = '';
    this.isIncludeAddress =
      this.dataManagementSwitchboard.nameOfVisibleEntity ===
      'DataManagementClientService';
    this.isVisible = this.isComponentVisible();
    this.cdr.detectChanges();
  }

  private readSignals(): void {
    effect(
      () => {
        const restored = this.dataManagementSearch.restoreSearch();
        if (restored) {
          console.log('restoreSearch:', restored);
          this.searchString = restored;
          this.cdr.detectChanges();
        }
      },
      { allowSignalWrites: true }
    );

    effect(
      () => {
        const focusChanged = this.dataManagementSwitchboard.isFocusChanged();

        if (focusChanged) {
          console.log('Fokus geändert:', focusChanged);
          this.handleFocusChange();
          this.dataManagementSwitchboard.isFocusChanged.set(false);
        }
      },
      { allowSignalWrites: true }
    );
  }
}
