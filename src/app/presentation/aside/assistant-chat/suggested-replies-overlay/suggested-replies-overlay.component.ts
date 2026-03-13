// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Floating overlay for suggested reply options above the chat input.
 * @param config - The suggested replies configuration (single/multi mode, options, prompt)
 * @param selected - Emits selected values when user confirms
 * @param dismissed - Emits when overlay is closed without selection
 */

import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-reply.interface';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-suggested-replies-overlay',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './suggested-replies-overlay.component.html',
  styleUrls: ['./suggested-replies-overlay.component.scss'],
})
export class SuggestedRepliesOverlayComponent {
  config = input.required<ISuggestedRepliesConfig>();
  selected = output<string[]>();
  dismissed = output<void>();

  faTimes = faTimes;
  faCheck = faCheck;

  checkedValues = signal<Set<string>>(new Set());

  onChipClick(value: string): void {
    this.selected.emit([value]);
  }

  onCheckboxToggle(value: string): void {
    const current = new Set(this.checkedValues());
    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }
    this.checkedValues.set(current);
  }

  onConfirm(): void {
    this.selected.emit([...this.checkedValues()]);
  }

  onDismiss(): void {
    this.dismissed.emit();
  }

  isChecked(value: string): boolean {
    return this.checkedValues().has(value);
  }
}
