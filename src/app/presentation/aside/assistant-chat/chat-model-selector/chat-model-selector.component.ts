// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * LLM model selector in the assistant chat header: shows the selected model with its input cost and
 * opens a dropdown of the enabled models. A click anywhere outside the selector closes the dropdown.
 * Reads and writes the model choice through the chat's component-scoped ChatModelSelectionService.
 * @param showModelDropdown - Whether the model list is open
 */
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { ChatModelSelectionService } from '../services/chat-model-selection.service';

const MODEL_DROPDOWN_SELECTOR = '.model-dropdown';

@Component({
  selector: 'app-chat-model-selector',
  standalone: true,
  imports: [FontAwesomeModule, TranslateModule],
  templateUrl: './chat-model-selector.component.html',
  styleUrls: ['./chat-model-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatModelSelectorComponent {
  readonly modelSelection = inject(ChatModelSelectionService);

  readonly faChevronDown = faChevronDown;
  readonly showModelDropdown = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest(MODEL_DROPDOWN_SELECTOR)) {
      this.showModelDropdown.set(false);
    }
  }

  toggleModelDropdown(): void {
    this.showModelDropdown.update((v) => !v);
  }

  selectModel(modelId: string): void {
    this.modelSelection.selectModel(modelId);
    this.showModelDropdown.set(false);
  }
}
