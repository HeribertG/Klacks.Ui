// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Global search component for the header bar.
 * Delegates search execution to the active strategy via SearchStrategyService.
 */
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';

import { form, FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { SearchStrategyService } from './search-strategy.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { SearchService } from 'src/app/application/services/search.service';
import { SearchInputComponent } from 'src/app/presentation/shared/search-input/search-input.component';

interface ISearchFilterModel {
  includeAddress: boolean;
  includeClient: boolean;
}

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  standalone: true,
  imports: [FormField, TranslateModule, SearchInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  private readonly searchStrategyService = inject(SearchStrategyService);
  private readonly workplaceState = inject(WorkplaceStateService);
  readonly searchService = inject(SearchService);

  readonly searchString = signal('');
  readonly filterModel = signal<ISearchFilterModel>({ includeAddress: false, includeClient: false });
  readonly filterForm = form(this.filterModel, () => {});

  constructor() {
    effect(() => {
      this.searchString.set(this.searchStrategyService.restoreSearch());
    });

    effect(() => {
      const focusChanged = this.workplaceState.isFocusChanged();
      if (focusChanged) {
        this.handleFocusChange();
        untracked(() => this.workplaceState.isFocusChanged.set(false));
      }
    });
  }

  onClickSearch(): void {
    const filter = this.filterModel();
    this.searchStrategyService.globalSearch(
      this.searchString(),
      filter.includeAddress,
      filter.includeClient
    );
  }

  onSearchValueChange(value: string): void {
    this.searchString.set(value);
    if (value === '') {
      this.searchStrategyService.resetFilterWithoutSignalWrite();
    }
  }

  @HostListener('search')
  onsearch(): void {
    this.onClickSearch();
  }

  private handleFocusChange(): void {
    this.searchStrategyService.resetFilter();
    this.searchString.set('');
    this.filterModel.set({ includeAddress: false, includeClient: false });
  }
}
