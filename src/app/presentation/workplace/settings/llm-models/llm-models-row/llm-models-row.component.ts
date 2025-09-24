import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ILLMModel } from 'src/app/infrastructure/api/data-llm.service';

@Component({
  selector: 'app-llm-models-row',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './llm-models-row.component.html',
  styleUrls: ['./llm-models-row.component.scss'],
})
export class LLMModelsRowComponent {
  @Input() data!: ILLMModel;
  @Output() editEvent = new EventEmitter<ILLMModel>();
  @Output() isDeleteEvent = new EventEmitter<void>();

  constructor(public translate: TranslateService) {}

  onClickEdit(): void {
    this.editEvent.emit(this.data);
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit();
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
