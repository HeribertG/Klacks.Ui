// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Card wrapper for settings list views within plugins.
 * Provides headline, scrollable content area, and optional add button.
 * @param headline - Card heading text (required)
 * @param addLabel - Label for the add button
 * @param showAddButton - Whether to show the add button
 * @param showHeader - Whether to show the header content slot
 * @param idPrefix - DOM ID prefix for test selectors
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';

@Component({
  selector: 'lib-settings-list-card',
  templateUrl: './settings-list-card.component.html',
  styleUrls: ['./settings-list-card.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginSettingsListCardComponent {
  @Input({ required: true }) headline!: string;
  @Input() addLabel = 'Hinzufuegen';
  @Input() showAddButton = true;
  @Input() showHeader = false;
  @Input() idPrefix = 'settings-list';
  @Output() addClick = new EventEmitter<void>();

  onAddClick(): void {
    this.addClick.emit();
  }
}
