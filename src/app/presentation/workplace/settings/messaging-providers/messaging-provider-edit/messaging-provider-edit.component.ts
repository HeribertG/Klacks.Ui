// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modal form component for adding or editing a messaging provider.
 * Displays provider-specific input fields and converts them to JSON internally.
 * @param provider - The existing provider to edit, or null for a new provider
 * @param saved - Emitted with the form data when the user clicks Save
 * @param cancelled - Emitted when the user clicks Cancel
 */
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MessagingProvider } from 'src/app/domain/models/messaging/messaging-provider.model';
import { CreateMessagingProvider } from 'src/app/domain/models/messaging/create-messaging-provider.model';

const PROVIDER_TYPES = ['Telegram', 'WhatsApp', 'Signal', 'SMS'] as const;

interface ProviderConfigFields {
  [key: string]: string;
}

const PROVIDER_FIELD_DEFINITIONS: Record<string, { key: string; labelDe: string; labelEn: string; type: string; placeholder: string }[]> = {
  Telegram: [
    { key: 'BotToken', labelDe: 'Bot-Token', labelEn: 'Bot Token', type: 'password', placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11' },
    { key: 'WebhookUrl', labelDe: 'Webhook-URL', labelEn: 'Webhook URL', type: 'url', placeholder: 'https://your-domain.com/api/messaging/webhook/telegram' },
  ],
  WhatsApp: [
    { key: 'AccessToken', labelDe: 'Access-Token', labelEn: 'Access Token', type: 'password', placeholder: 'EAABs...' },
    { key: 'PhoneNumberId', labelDe: 'Telefonnummer-ID', labelEn: 'Phone Number ID', type: 'text', placeholder: '106540352...' },
    { key: 'BusinessAccountId', labelDe: 'Business-Account-ID', labelEn: 'Business Account ID', type: 'text', placeholder: '102489...' },
  ],
  Signal: [
    { key: 'SignalNumber', labelDe: 'Signal-Nummer', labelEn: 'Signal Number', type: 'tel', placeholder: '+49171...' },
    { key: 'ApiUrl', labelDe: 'Signal-CLI API-URL', labelEn: 'Signal CLI API URL', type: 'url', placeholder: 'http://localhost:8080' },
  ],
  SMS: [
    { key: 'ApiKey', labelDe: 'API-Schlüssel', labelEn: 'API Key', type: 'password', placeholder: 'sk_live_...' },
    { key: 'SenderNumber', labelDe: 'Absendernummer', labelEn: 'Sender Number', type: 'tel', placeholder: '+49171...' },
    { key: 'GatewayUrl', labelDe: 'Gateway-URL', labelEn: 'Gateway URL', type: 'url', placeholder: 'https://api.twilio.com/...' },
  ],
};

@Component({
  selector: 'app-messaging-provider-edit',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './messaging-provider-edit.component.html',
  styleUrls: ['./messaging-provider-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingProviderEditComponent implements OnInit {

  @Input() provider: MessagingProvider | null = null;
  @Input() existingConfigJson = '';
  @Output() saved = new EventEmitter<CreateMessagingProvider>();
  @Output() cancelled = new EventEmitter<void>();

  name = '';
  displayName = '';
  providerType = 'Telegram';
  isEnabled = true;

  configFields: ProviderConfigFields = {};

  readonly providerTypes = PROVIDER_TYPES;

  ngOnInit(): void {
    if (this.provider) {
      this.name = this.provider.name;
      this.displayName = this.provider.displayName;
      this.providerType = this.provider.providerType;
      this.isEnabled = this.provider.isEnabled;
      this.parseExistingConfig();
    }
    this.initConfigFields();
  }

  getFieldDefinitions(): typeof PROVIDER_FIELD_DEFINITIONS[string] {
    return PROVIDER_FIELD_DEFINITIONS[this.providerType] ?? [];
  }

  onProviderTypeChange(): void {
    this.configFields = {};
    this.initConfigFields();
  }

  isFormValid(): boolean {
    return !!(this.name && this.displayName && this.providerType);
  }

  onSave(): void {
    if (!this.isFormValid()) return;
    const dto: CreateMessagingProvider = {
      name: this.name,
      displayName: this.displayName,
      providerType: this.providerType,
      configJson: this.buildConfigJson(),
      isEnabled: this.isEnabled,
    };
    this.saved.emit(dto);
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  private initConfigFields(): void {
    const definitions = this.getFieldDefinitions();
    for (const def of definitions) {
      if (!(def.key in this.configFields)) {
        this.configFields[def.key] = '';
      }
    }
  }

  private parseExistingConfig(): void {
    if (!this.existingConfigJson) return;
    try {
      const parsed = JSON.parse(this.existingConfigJson);
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string') {
          this.configFields[key] = value;
        }
      }
    } catch {
      // invalid JSON, ignore
    }
  }

  private buildConfigJson(): string {
    const config: Record<string, string> = {};
    for (const def of this.getFieldDefinitions()) {
      const value = this.configFields[def.key]?.trim();
      if (value) {
        config[def.key] = value;
      }
    }
    return JSON.stringify(config);
  }
}
