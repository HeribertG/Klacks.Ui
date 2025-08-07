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
import { WorkplaceStateService } from 'src/app/data/management/workplace-state.service';
import { EntityName } from 'src/app/data/management/entity-names.enum';
import { SearchService } from 'src/app/services/search.service';

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
  private workplaceState = inject(WorkplaceStateService);
  public searchService = inject(SearchService);

  public faSearch = faSearch;
  public includeAddress = false;
  public includeClient = false;
  public searchString = '';

  constructor() {
    effect(() => {
      const restored = this.dataManagementSearch.restoreSearch();
      this.searchString = restored;
      this.cdr.detectChanges();
    });

    effect(() => {
      const focusChanged = this.workplaceState.isFocusChanged();

      if (focusChanged) {
        this.handleFocusChange();
        this.workplaceState.isFocusChanged.set(false);
      }
    });
  }

  onClickSearch(): void {
    this.dataManagementSearch.globalSearch(
      this.searchString,
      this.includeAddress,
      this.includeClient
    );
  }

  onKeyupSearch(event: any): void {
    if (event.srcElement && event.srcElement.value.toString() === '') {
      this.dataManagementSearch.resetFilterWithoutSignalWrite();
    }
  }

  @HostListener('search', ['$event'])
  onsearch(event: KeyboardEvent): void {
    this.onClickSearch();
  }

  private handleFocusChange(): void {
    this.dataManagementSearch.resetFilter();
    this.searchString = '';
    this.includeAddress = false;
    this.includeClient = false;
    this.cdr.detectChanges();
  }
}
