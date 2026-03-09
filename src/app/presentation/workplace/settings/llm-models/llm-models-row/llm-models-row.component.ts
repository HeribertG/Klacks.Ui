// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, Input, Output, EventEmitter, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-llm-models-row',
  standalone: true,
  imports: [FormsModule, TranslateModule, TrashIconRedComponent],
  templateUrl: './llm-models-row.component.html',
  styleUrls: ['./llm-models-row.component.scss'],
})
export class LLMModelsRowComponent {
  translate = inject(TranslateService);

  @Input() data!: IAssistantModel;
  @Output() editEvent = new EventEmitter<IAssistantModel>();
  @Output() isDeleteEvent = new EventEmitter<IAssistantModel>();

  onClickEdit(): void {
    this.editEvent.emit(this.data);
  }

  onClickDelete(): void {
    if (!this.data.isDefault) {
      this.isDeleteEvent.emit(this.data);
    }
  }

  getModelDisplayText(): string {
    const modelId = this.data.modelId || '';
    const displayName = this.data.displayName || modelId;
    const provider = this.data.providerId?.toUpperCase() || '';

    // Try to extract version from modelId (e.g., "gpt-3.5-turbo" -> "3.5")
    const versionMatch = modelId.match(/(\d+\.?\d*)/);
    const version = versionMatch ? versionMatch[1] : '';

    if (version) {
      return `${displayName} ${version} (${provider})`;
    } else {
      return `${displayName} (${provider})`;
    }
  }

  formatCost(cost: number): string {
    return `€${cost.toFixed(4)}/1K`;
  }

  getProviderClass(provider: string): string {
    return `provider-${provider.toLowerCase()}`;
  }
}
