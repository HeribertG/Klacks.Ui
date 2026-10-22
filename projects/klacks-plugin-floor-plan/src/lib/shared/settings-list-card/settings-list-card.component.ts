// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Plugin-own settings list card (headline, projected rows and an add link), the floor-plan counterpart of the host
 * settings list card without its header search.
 * @param headline - Title shown in the card header
 * @param addLabel - Text of the add link below the rows
 * @param showAddButton - Shows the add link
 * @param showHeader - Shows the projected [header] content above the rows
 * @param idPrefix - Prefix of the element ids inside the card
 * @param addClick - Emits when the add link is clicked
 */

import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'lib-settings-list-card',
  templateUrl: './settings-list-card.component.html',
  styleUrls: ['./settings-list-card.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginSettingsListCardComponent {
  readonly headline = input('');
  readonly addLabel = input('');
  readonly showAddButton = input(true);
  readonly showHeader = input(false);
  readonly idPrefix = input('settings-list');
  readonly addClick = output<void>();

  onAddClick(): void {
    this.addClick.emit();
  }
}
