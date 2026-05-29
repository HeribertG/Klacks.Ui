// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Client search component with datalist autocomplete for the header bar.
 * Searches clients by name/number and emits the selected client.
 * @param clientSelected - Emits the selected IClient when user picks from datalist
 */
import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  EventEmitter,
  HostListener,
  Output,
  OnDestroy,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { Subject, takeUntil } from 'rxjs';
import { IClient } from 'src/app/domain/models/client/client-class';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { SearchService } from 'src/app/application/services/search.service';
import { isNumeric, isMultipleNumeric } from 'src/app/shared/helpers/number.helper';

const MIN_SEARCH_LENGTH = 3;
const DEBOUNCE_DELAY_MS = 2000;
const MAX_RESULTS = 20;

@Component({
  selector: 'app-search-client',
  templateUrl: './search-client.component.html',
  styleUrls: ['./search-client.component.scss'],
  standalone: true,
  imports: [FormsModule, FontAwesomeModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchClientComponent implements OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private dataClientService = inject(DataClientService);
  public searchService = inject(SearchService);

  @Output() clientSelected = new EventEmitter<IClient>();

  faSearch = faSearch;
  searchString = '';
  results: IClient[] = [];
  selectedClient: IClient | undefined = undefined;

  private destroy$ = new Subject<void>();
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

  @HostListener('search')
  onsearch(): void {
    if (!this.searchString) {
      this.clearSelection();
    }
  }

  onKeyupSearch(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.applySelection();
      return;
    }

    if (isNumeric(this.searchString) || isMultipleNumeric(this.searchString)) {
      this.searchClients(true);
      return;
    }

    if (this.searchString && this.searchString.length >= MIN_SEARCH_LENGTH) {
      this.searchClients();
      return;
    }

    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => {
      this._debounceTimer = null;
      this.searchClients();
      this.cdr.markForCheck();
    }, DEBOUNCE_DELAY_MS);
  }

  onSearchStringChange(value: string): void {
    this.searchString = value;
    const matched = this.results.find((c) => this.formatClientName(c) === value);
    this.selectedClient = matched;
  }

  onClickSearch(): void {
    this.applySelection();
  }

  ngOnDestroy(): void {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private searchClients(isNumber = false): void {
    if (!this.searchString || (!isNumber && this.searchString.length < 2)) {
      return;
    }

    const split = this.searchString.split(' - ');
    const term = split.length >= 1 && isNumeric(split[0]) ? split[0] : this.searchString;

    const filter = {
      searchString: term,
      numberOfItemsPerPage: MAX_RESULTS,
      firstItemOnLastPage: 0,
    };

    this.dataClientService
      .readClientList(filter as never)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        this.results = response.clients;

        if (this.results.length === 1) {
          this.selectedClient = this.results[0];
          const displayName = this.formatClientName(this.results[0]);
          if (!displayName.includes(this.searchString)) {
            this.searchString = displayName;
          }
        }
        this.cdr.markForCheck();
      });
  }

  private applySelection(): void {
    if (this.selectedClient) {
      this.clientSelected.emit(this.selectedClient);
      this.clearSelection();
    }
  }

  private clearSelection(): void {
    this.selectedClient = undefined;
    this.searchString = '';
    this.results = [];
    this.cdr.markForCheck();
  }

  private formatClientName(client: IClient): string {
    return `${client.idNumber} - ${client.company} ${client.firstName} ${client.name}`;
  }
}
