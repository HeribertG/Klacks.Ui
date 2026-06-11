// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Component,
  HostListener,
  effect,
  untracked,
  ChangeDetectorRef,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SearchStrategyService } from './search-strategy.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { SearchService } from 'src/app/application/services/search.service';
import { SearchInputComponent } from 'src/app/presentation/shared/search-input/search-input.component';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, SearchInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  private cdr = inject(ChangeDetectorRef);
  private searchStrategyService = inject(SearchStrategyService);
  private workplaceState = inject(WorkplaceStateService);
  public searchService = inject(SearchService);

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
        untracked(() => this.workplaceState.isFocusChanged.set(false));
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

  onSearchValueChange(value: string): void {
    if (value === '') {
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
