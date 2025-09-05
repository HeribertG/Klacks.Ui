import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { LLMService } from 'src/app/presentation/aside/llm-chat/services/llm.service';
import { LLMModel } from 'src/app/presentation/aside/llm-chat/models/llm-model.interface';

@Component({
  selector: 'app-llm-models',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './llm-models.component.html',
  styleUrls: ['./llm-models.component.scss']
})
export class LLMModelsComponent implements OnInit, OnDestroy {
  private llmService = inject(LLMService);
  private destroy$ = new Subject<void>();

  models: LLMModel[] = [];
  isLoading = false;

  ngOnInit(): void {
    this.loadModels();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadModels(): void {
    this.isLoading = true;
    this.llmService.getAvailableModels().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (models) => {
        this.models = models;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading LLM models:', error);
        this.isLoading = false;
      }
    });
  }

  toggleModel(model: LLMModel): void {
    // Toggle the model's enabled state
    model.isEnabled = !model.isEnabled;
    
    // TODO: Send update to backend
    console.log(`Model ${model.name} ${model.isEnabled ? 'enabled' : 'disabled'}`);
  }

  setAsDefault(model: LLMModel): void {
    // Set all models to not default
    this.models.forEach(m => m.isDefault = false);
    
    // Set selected model as default
    model.isDefault = true;
    model.isEnabled = true; // Default model must be enabled
    
    // TODO: Send update to backend
    console.log(`Model ${model.name} set as default`);
  }

  formatCost(cost: number): string {
    return `€${cost.toFixed(4)}/1K`;
  }

  getProviderClass(provider: string): string {
    return `provider-${provider.toLowerCase()}`;
  }

  getUsageStats(): { totalCost: number; modelUsage: { [key: string]: number } } {
    return this.llmService.getUsageStatistics(30);
  }
}