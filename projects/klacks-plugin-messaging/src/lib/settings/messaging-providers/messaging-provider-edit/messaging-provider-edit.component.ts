// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modal form component for adding or editing a messaging provider.
 * Displays provider-specific input fields and converts them to JSON internally.
 * @param provider - The existing provider to edit, or null for a new provider
 * @param saved - Emitted with the form data when the user clicks Save
 * @param cancelled - Emitted when the user clicks Cancel
 */
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MessagingProvider } from '../../../models/messaging-provider.model';
import { CreateMessagingProvider } from '../../../models/create-messaging-provider.model';

const PROVIDER_TYPES = ['Telegram', 'WhatsApp', 'Signal', 'SMS', 'Threema', 'Viber', 'LINE', 'KakaoTalk', 'WeChat', 'Zalo', 'MicrosoftTeams', 'Slack'] as const;

type ProviderConfigFields = Record<string, string>;

type TokenValidationState = { state: 'idle' | 'loading' | 'invalid' } | { state: 'valid'; botName: string };

const TELEGRAM_WEBHOOK_PATH = '/api/messaging/webhook/telegram';

const PROVIDER_FIELD_DEFINITIONS: Record<string, { key: string; labelDe: string; labelEn: string; type: string; placeholder: string; readonly?: boolean; autoFill?: () => string }[]> = {
  Telegram: [
    { key: 'BotToken', labelDe: 'Bot-Token', labelEn: 'Bot Token', type: 'password', placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11' },
    { key: 'WebhookUrl', labelDe: 'Webhook-URL', labelEn: 'Webhook URL', type: 'url', placeholder: TELEGRAM_WEBHOOK_PATH, readonly: true, autoFill: () => `${window.location.origin}${TELEGRAM_WEBHOOK_PATH}` },
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
  Threema: [
    { key: 'GatewayId', labelDe: 'Gateway-ID', labelEn: 'Gateway ID', type: 'text', placeholder: '*MYGATEWAY' },
    { key: 'ApiSecret', labelDe: 'API-Secret', labelEn: 'API Secret', type: 'password', placeholder: 'a1b2c3d4e5...' },
  ],
  Viber: [
    { key: 'AuthToken', labelDe: 'Auth-Token', labelEn: 'Auth Token', type: 'password', placeholder: '4a5e6f7g8h9i...' },
    { key: 'SenderName', labelDe: 'Absendername', labelEn: 'Sender Name', type: 'text', placeholder: 'Klacks Bot' },
  ],
  LINE: [
    { key: 'ChannelAccessToken', labelDe: 'Channel-Access-Token', labelEn: 'Channel Access Token', type: 'password', placeholder: 'eyJhbGciOi...' },
    { key: 'ChannelSecret', labelDe: 'Channel-Secret', labelEn: 'Channel Secret', type: 'password', placeholder: 'abc123def456...' },
  ],
  KakaoTalk: [
    { key: 'AppKey', labelDe: 'App-Schlüssel', labelEn: 'App Key', type: 'password', placeholder: 'a1b2c3d4...' },
    { key: 'TemplateId', labelDe: 'Template-ID', labelEn: 'Template ID', type: 'text', placeholder: '12345' },
  ],
  WeChat: [
    { key: 'AppId', labelDe: 'App-ID', labelEn: 'App ID', type: 'text', placeholder: 'wx1234567890abcdef' },
    { key: 'AppSecret', labelDe: 'App-Secret', labelEn: 'App Secret', type: 'password', placeholder: 'abc123def456...' },
  ],
  Zalo: [
    { key: 'AppId', labelDe: 'App-ID', labelEn: 'App ID', type: 'text', placeholder: '123456789...' },
    { key: 'SecretKey', labelDe: 'Secret-Key', labelEn: 'Secret Key', type: 'password', placeholder: 'abc123...' },
    { key: 'OaId', labelDe: 'OA-ID', labelEn: 'OA ID', type: 'text', placeholder: '987654321...' },
  ],
  MicrosoftTeams: [
    { key: 'TenantId', labelDe: 'Tenant-ID', labelEn: 'Tenant ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { key: 'ClientId', labelDe: 'Client-ID (App-ID)', labelEn: 'Client ID (App ID)', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { key: 'ClientSecret', labelDe: 'Client-Secret', labelEn: 'Client Secret', type: 'password', placeholder: '~abc123...' },
  ],
  Slack: [
    { key: 'BotToken', labelDe: 'Bot-Token', labelEn: 'Bot Token', type: 'password', placeholder: 'xoxb-123456789-...' },
    { key: 'SigningSecret', labelDe: 'Signing-Secret', labelEn: 'Signing Secret', type: 'password', placeholder: 'abc123def456...' },
    { key: 'DefaultChannel', labelDe: 'Standard-Kanal', labelEn: 'Default Channel', type: 'text', placeholder: '#general' },
  ],
};

const TELEGRAM_API = 'https://api.telegram.org';

@Component({
  selector: 'lib-messaging-provider-edit',
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
  @Output() providerTypeChanged = new EventEmitter<string>();

  name = '';
  providerType = 'Telegram';
  isEnabled = true;

  configFields: ProviderConfigFields = {};

  readonly providerTypes = PROVIDER_TYPES;
  readonly telegramValidation = signal<TokenValidationState>({ state: 'idle' });

  ngOnInit(): void {
    if (this.provider) {
      this.name = this.provider.displayName || this.provider.name;
      this.providerType = this.provider.providerType;
      this.isEnabled = this.provider.isEnabled;
      this.parseExistingConfig();
    }
    this.initConfigFields();
    this.providerTypeChanged.emit(this.providerType);

    if (this.providerType === 'Telegram' && this.configFields['BotToken']) {
      void this.validateTelegramToken(this.configFields['BotToken']);
    }
  }

  getFieldDefinitions(): typeof PROVIDER_FIELD_DEFINITIONS[string] {
    return PROVIDER_FIELD_DEFINITIONS[this.providerType] ?? [];
  }

  onProviderTypeChange(): void {
    this.configFields = {};
    this.telegramValidation.set({ state: 'idle' });
    this.initConfigFields();
    this.providerTypeChanged.emit(this.providerType);
  }

  onFieldBlur(fieldKey: string): void {
    if (this.providerType !== 'Telegram' || fieldKey !== 'BotToken') return;
    const token = this.configFields['BotToken']?.trim();
    if (!token) {
      this.telegramValidation.set({ state: 'idle' });
      return;
    }
    void this.validateTelegramToken(token);
  }

  onTokenInput(fieldKey: string): void {
    if (this.providerType !== 'Telegram' || fieldKey !== 'BotToken') return;
    const current = this.telegramValidation().state;
    if (current === 'valid' || current === 'invalid') {
      this.telegramValidation.set({ state: 'idle' });
    }
  }

  isFormValid(): boolean {
    return !!(this.name && this.providerType) && this.telegramValidation().state !== 'invalid';
  }

  onSave(): void {
    if (!this.isFormValid()) return;
    const internalName = this.name.toLowerCase().replace(/\s+/g, '-');
    const dto: CreateMessagingProvider = {
      name: internalName,
      displayName: this.name,
      providerType: this.providerType,
      configJson: this.buildConfigJson(),
      isEnabled: this.isEnabled,
    };
    this.saved.emit(dto);
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  private async validateTelegramToken(token: string): Promise<void> {
    this.telegramValidation.set({ state: 'loading' });
    try {
      const response = await fetch(`${TELEGRAM_API}/bot${token}/getMe`);
      const data = await response.json();
      if (data.ok === true && data.result?.username) {
        this.telegramValidation.set({ state: 'valid', botName: data.result.username });
      } else {
        this.telegramValidation.set({ state: 'invalid' });
      }
    } catch {
      this.telegramValidation.set({ state: 'invalid' });
    }
  }

  private initConfigFields(): void {
    const definitions = this.getFieldDefinitions();
    for (const def of definitions) {
      if (!(def.key in this.configFields) || this.configFields[def.key] === '') {
        this.configFields[def.key] = def.autoFill ? def.autoFill() : '';
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
