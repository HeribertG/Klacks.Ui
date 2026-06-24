// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Client search component with datalist autocomplete for the header bar.
 * Searches clients by name/number and emits the selected client.
 * @param clientSelected - Emits the selected IClient when user picks from datalist
 */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
export class SearchClientComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dataClientService = inject(DataClientService);
  readonly searchService = inject(SearchService);

  readonly clientSelected = output<IClient>();

  readonly faSearch = faSearch;
  readonly results = signal<IClient[]>([]);
  readonly selectedClient = signal<IClient | undefined>(undefined);
  readonly searchString = signal('');
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this._debounceTimer !== null) {
        clearTimeout(this._debounceTimer);
      }
    });
  }

  @HostListener('search')
  onsearch(): void {
    if (!this.searchString()) {
      this.clearSelection();
    }
  }

  onKeyupSearch(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      if (isMultipleNumeric(this.searchString())) {
        const idNumbers = this.searchString()
          .split(';')
          .filter((p) => p.trim() !== '')
          .map((p) => parseInt(p.trim(), 10));
        this.searchService.emitClientIdNumbersSelected(idNumbers);
        this.clearSelection();
        return;
      }
      this.applySelection();
      return;
    }

    if (isNumeric(this.searchString()) || isMultipleNumeric(this.searchString())) {
      this.searchClients(true);
      return;
    }

    if (this.searchString() && this.searchString().length >= MIN_SEARCH_LENGTH) {
      this.searchClients();
      return;
    }

    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => {
      this._debounceTimer = null;
      this.searchClients();
    }, DEBOUNCE_DELAY_MS);
  }

  onSearchStringChange(value: string): void {
    this.searchString.set(value);
    const matched = this.results().find((c) => this.formatClientName(c) === value);
    this.selectedClient.set(matched);
  }

  onClickSearch(): void {
    this.applySelection();
  }

  private searchClients(isNumber = false): void {
    const current = this.searchString();
    if (!current || (!isNumber && current.length < 2)) {
      return;
    }

    const split = current.split(' - ');
    const term = split.length >= 1 && isNumeric(split[0]) ? split[0] : current;

    const filter = {
      searchString: term,
      numberOfItemsPerPage: MAX_RESULTS,
      firstItemOnLastPage: 0,
    };

    this.dataClientService
      .readClientList(filter as never)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.results.set(response.clients);

        const clients = this.results();
        if (clients.length === 1) {
          this.selectedClient.set(clients[0]);
          const displayName = this.formatClientName(clients[0]);
          if (!displayName.includes(this.searchString())) {
            this.searchString.set(displayName);
          }
        }
      });
  }

  private applySelection(): void {
    const client = this.selectedClient();
    if (client) {
      this.clientSelected.emit(client);
      this.clearSelection();
    }
  }

  private clearSelection(): void {
    this.selectedClient.set(undefined);
    this.searchString.set('');
    this.results.set([]);
  }

  private formatClientName(client: IClient): string {
    return `${client.idNumber} - ${client.company} ${client.firstName} ${client.name}`;
  }
}
