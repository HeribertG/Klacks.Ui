// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchInputComponent } from 'src/app/presentation/shared/search-input/search-input.component';

@Component({
  selector: 'app-settings-list-card',
  templateUrl: './settings-list-card.component.html',
  styleUrls: ['./settings-list-card.component.scss'],
  standalone: true,
  imports: [CommonModule, SearchInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsListCardComponent {
  readonly headline = input('');
  readonly addLabel = input('Hinzufügen');
  readonly showAddButton = input(true);
  readonly showHeader = input(false);
  readonly idPrefix = input('settings-list');
  readonly showSearchInHeader = input(false);
  readonly searchPlaceholderKey = input('placeholder.search');
  @Output() addClick = new EventEmitter<void>();
  @Output() headerSearchChange = new EventEmitter<string>();

  onAddClick(): void {
    this.addClick.emit();
  }
}
