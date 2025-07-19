/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  HostListener,
  effect,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { DataManagementSearchService } from 'src/app/data/management/data-management-search.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, TranslateModule],
})
export class SearchComponent {
  private cdr = inject(ChangeDetectorRef);
  private dataManagementSearch = inject(DataManagementSearchService);
  private dataManagementSwitchboard = inject(DataManagementSwitchboardService);

  public faSearch = faSearch;
  public includeAddress = false;
  public isIncludeAddress = false;
  public includeClient = false;
  public isIncludeClient = false;
  public isVisible = false;
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

  onClickSearch(): void {
    this.dataManagementSearch.globalSearch(
      this.searchString,
      this.includeAddress
    );
  }

  onKeyupSearch(event: any): void {
    if (event.srcElement && event.srcElement.value.toString() === '') {
      this.onClickSearch();
    }
  }

  @HostListener('search', ['$event'])
  onsearch(event: KeyboardEvent): void {
    this.onClickSearch();
  }

  // Private methods
  private handleFocusChange(): void {
    this.dataManagementSearch.resetFilter();
    this.searchString = '';
    this.isIncludeAddress =
      this.dataManagementSwitchboard.nameOfVisibleEntity ===
      'DataManagementClientService';
    this.isIncludeClient =
      this.dataManagementSwitchboard.nameOfVisibleEntity ===
      'DataManagementShiftService';
    this.isVisible = this.isComponentVisible();
    this.cdr.detectChanges();
  }

  private isComponentVisible(): boolean {
    switch (this.dataManagementSwitchboard.nameOfVisibleEntity) {
      case 'DataManagementClientService':
      case 'DataManagementBreakService':
      case 'DataManagementScheduleService':
      case 'DataManagementShiftService':
        return true;
      case 'DataManagementGroupService':
        return this.dataManagementSwitchboard.isSearchVisible;
    }

    return false;
  }
}
