import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ILLMProvider } from 'src/app/infrastructure/api/data-llm-provider.service';

@Component({
  selector: 'app-llm-providers-row',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './llm-providers-row.component.html',
  styleUrls: ['./llm-providers-row.component.scss']
})
export class LLMProvidersRowComponent {
  @Input() data!: ILLMProvider;
  @Input() canDelete = true;
  @Output() editEvent = new EventEmitter<ILLMProvider>();
  @Output() deleteEvent = new EventEmitter<ILLMProvider>();
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public translate = inject(TranslateService);

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