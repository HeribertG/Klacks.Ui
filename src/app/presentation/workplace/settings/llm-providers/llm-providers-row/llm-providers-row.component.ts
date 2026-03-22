// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { IAssistantProvider } from 'src/app/infrastructure/api/assistant/data-assistant-provider.service';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-llm-providers-row',
  standalone: true,
  imports: [FormsModule, TranslateModule, TrashIconRedComponent],
  templateUrl: './llm-providers-row.component.html',
  styleUrls: ['./llm-providers-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LLMProvidersRowComponent {
  @Input() data!: IAssistantProvider;
  @Input() canDelete = true;
  @Output() editEvent = new EventEmitter<IAssistantProvider>();
  @Output() deleteEvent = new EventEmitter<IAssistantProvider>();

  onEdit(): void {
    this.editEvent.emit(this.data);
  }

  onDelete(): void {
    if (this.canDelete) {
      this.deleteEvent.emit(this.data);
    }
  }

  getProviderDisplayText(): string {
    return `${this.data.providerName} (${this.data.providerId})`;
  }
}