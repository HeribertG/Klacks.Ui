import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEdit, faToggleOn, faToggleOff, faKey, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { ILLMProvider } from '../llm-providers.component';

@Component({
  selector: 'app-llm-providers-row',
  standalone: true,
  imports: [CommonModule, TranslateModule, FontAwesomeModule],
  templateUrl: './llm-providers-row.component.html',
  styleUrls: ['./llm-providers-row.component.scss']
})
export class LLMProvidersRowComponent {
  @Input() data!: ILLMProvider;
  @Output() editEvent = new EventEmitter<ILLMProvider>();
  @Output() toggleEnableEvent = new EventEmitter<void>();

  public translate = inject(TranslateService);

  faEdit = faEdit;
  faToggleOn = faToggleOn;
  faToggleOff = faToggleOff;
  faKey = faKey;
  faExclamationTriangle = faExclamationTriangle;

  onEdit(): void {
    this.editEvent.emit(this.data);
  }

  onToggleEnable(): void {
    this.toggleEnableEvent.emit();
  }

  getProviderClass(): string {
    return `provider-${this.data.providerId.toLowerCase()}`;
  }

  getStatusClass(): string {
    if (this.data.isEnabled && this.data.hasApiKey) return 'status-enabled';
    if (!this.data.hasApiKey) return 'status-no-key';
    return 'status-disabled';
  }

  getStatusText(): string {
    if (!this.data.hasApiKey) return this.translate.instant('settings.llm-providers.status.no-key');
    return this.data.isEnabled 
      ? this.translate.instant('settings.llm-providers.status.enabled')
      : this.translate.instant('settings.llm-providers.status.disabled');
  }

  getApiKeyStatus(): string {
    return this.data.hasApiKey 
      ? this.translate.instant('settings.llm-providers.api-key-status.configured')
      : this.translate.instant('settings.llm-providers.api-key-status.missing');
  }

  formatBaseUrl(url?: string): string {
    if (!url) return '-';
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch {
      return url;
    }
  }
}