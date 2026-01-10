/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  HostListener,
  effect,
  ChangeDetectorRef,
  inject,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { SearchStrategyService } from './search-strategy.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { SearchService } from 'src/app/application/services/search.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  standalone: true,
  imports: [FormsModule, FontAwesomeModule, TranslateModule],
})
export class SearchComponent {
  private cdr = inject(ChangeDetectorRef);
  private searchStrategyService = inject(SearchStrategyService);
  private workplaceState = inject(WorkplaceStateService);
  public searchService = inject(SearchService);

  public faSearch = faSearch;
  public includeAddress = false;
  public includeClient = false;
  public searchString = '';

  constructor() {
    effect(() => {
      const restored = this.searchStrategyService.restoreSearch();
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
    this.searchStrategyService.globalSearch(
      this.searchString,
      this.includeAddress,
      this.includeClient
    );
  }

  onKeyupSearch(event: any): void {
    if (event.srcElement && event.srcElement.value.toString() === '') {
      this.searchStrategyService.resetFilterWithoutSignalWrite();
    }
  }

  @HostListener('search', ['$event'])
  onsearch(event: Event): void {
    this.onClickSearch();
  }

  private handleFocusChange(): void {
    this.searchStrategyService.resetFilter();
    this.searchString = '';
    this.includeAddress = false;
    this.includeClient = false;
    this.cdr.detectChanges();
  }
}
