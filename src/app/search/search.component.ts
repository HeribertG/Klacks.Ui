import {
  Component,
  HostListener,
  effect,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { DataManagementSearchService } from 'src/app/data/management/data-management-search.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, TranslateModule],
})
export class SearchComponent {
  @HostListener('search', ['$event'])
  onsearch(event: KeyboardEvent) {
    this.onClickSearch();
  }

  private dataManagementSwitchboard = inject(DataManagementSwitchboardService);
  private dataManagementSearch = inject(DataManagementSearchService);
  private cdr = inject(ChangeDetectorRef);

  public faSearch = faSearch;
  public isVisible = false;

  public isIncludeAddress = false;
  public includeAddress = false;
  public searchString = '';

  constructor() {
    effect(() => {
      const restored = this.dataManagementSearch.restoreSearch();
      if (restored) {
        this.searchString = restored;
        this.cdr.detectChanges();
      }
    });

    effect(() => {
      const focusChanged = this.dataManagementSwitchboard.isFocusChanged();

      if (focusChanged) {
        this.handleFocusChange();
        this.dataManagementSwitchboard.isFocusChanged.set(false);
      }
    });
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
        return true;
      case 'DataManagementGroupService':
        return this.dataManagementSwitchboard.isSearchVisible;
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
}
