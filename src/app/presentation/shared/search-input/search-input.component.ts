// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Reusable search/filter input field with optional search button.
 * Handles plain client-side filters as well as submit-on-enter style searches.
 * @param placeholderKey - i18n key for the placeholder text
 * @param value - The current search string (two-way bindable via [(value)])
 * @param showButton - Show the search submit button (defaults to true)
 * @param disabled - Disable the input
 * @param buttonDisabled - Disable only the search button
 * @param isLoading - Visual loading state for the search button
 * @param debounceMs - Debounce delay in ms for valueChange and search emissions
 * @param inputId - Optional id for the underlying input element
 */
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { Subject, debounceTime } from 'rxjs';

const DEFAULT_PLACEHOLDER_KEY = 'placeholder.search';

@Component({
  selector: 'app-search-input',
  templateUrl: './search-input.component.html',
  styleUrls: ['./search-input.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchInputComponent implements OnDestroy {
  private translateService = inject(TranslateService);

  @Input() placeholderKey = DEFAULT_PLACEHOLDER_KEY;
  @Input() value = '';
  @Input() showButton = true;
  @Input() disabled = false;
  @Input() buttonDisabled = false;
  @Input() isLoading = false;
  @Input() debounceMs = 0;
  @Input() inputId = '';

  @Output() valueChange = new EventEmitter<string>();
  @Output() searchSubmit = new EventEmitter<string>();

  faSearch = faSearch;

  private debounceSubject = new Subject<string>();
  private debounceSub = this.debounceSubject
    .pipe(debounceTime(0))
    .subscribe();

  ngOnDestroy(): void {
    this.debounceSub.unsubscribe();
    this.debounceSubject.complete();
  }

  get translatedPlaceholder(): string {
    return this.translateService.instant(
      this.placeholderKey || DEFAULT_PLACEHOLDER_KEY,
    );
  }

  onModelChange(next: string): void {
    this.value = next;
    if (this.debounceMs > 0) {
      this.scheduleDebounced(next);
      return;
    }
    this.valueChange.emit(next);
  }

  onSubmit(): void {
    if (this.disabled || this.buttonDisabled || this.isLoading) return;
    this.searchSubmit.emit(this.value);
  }

  private scheduleDebounced(next: string): void {
    this.debounceSub.unsubscribe();
    this.debounceSubject = new Subject<string>();
    this.debounceSub = this.debounceSubject
      .pipe(debounceTime(this.debounceMs))
      .subscribe(v => this.valueChange.emit(v));
    this.debounceSubject.next(next);
  }
}
