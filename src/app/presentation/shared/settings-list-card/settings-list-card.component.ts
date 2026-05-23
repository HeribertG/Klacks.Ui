// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
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
  @Input() headline = '';
  @Input() addLabel = 'Hinzufügen';
  @Input() showAddButton = true;
  @Input() showHeader = false;
  @Input() idPrefix = 'settings-list';
  @Input() showSearchInHeader = false;
  @Input() searchPlaceholderKey = 'placeholder.search';
  @Output() addClick = new EventEmitter<void>();
  @Output() headerSearchChange = new EventEmitter<string>();

  onAddClick(): void {
    this.addClick.emit();
  }
}
