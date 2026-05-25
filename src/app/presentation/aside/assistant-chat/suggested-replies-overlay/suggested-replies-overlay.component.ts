// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Floating overlay for suggested reply options above the chat input.
 * @param config - The suggested replies configuration (single/multi/date mode, options, prompt)
 * @param selected - Emits selected values when user confirms (ISO date string for date mode)
 * @param dismissed - Emits when overlay is closed without selection
 */

import { Component, input, output, signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-reply.interface';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-suggested-replies-overlay',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, TranslateModule],
  templateUrl: './suggested-replies-overlay.component.html',
  styleUrls: ['./suggested-replies-overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestedRepliesOverlayComponent {
  config = input.required<ISuggestedRepliesConfig>();
  selected = output<string[]>();
  dismissed = output<void>();

  faTimes = faTimes;
  faCheck = faCheck;

  checkedValues = signal<Set<string>>(new Set());
  selectedDate = signal<string>('');

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

  onDateInput(event: Event): void {
    this.selectedDate.set((event.target as HTMLInputElement).value);
  }

  onDateConfirm(): void {
    const value = this.selectedDate();
    if (!value) return;
    this.selected.emit([value]);
    this.selectedDate.set('');
  }

  onDismiss(): void {
    this.selectedDate.set('');
    this.dismissed.emit();
  }

  isChecked(value: string): boolean {
    return this.checkedValues().has(value);
  }
}
