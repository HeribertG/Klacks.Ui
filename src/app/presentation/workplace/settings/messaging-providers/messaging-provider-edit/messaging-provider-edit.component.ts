// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modal form component for adding or editing a messaging provider.
 * @param provider - The existing provider to edit, or null for a new provider
 * @param saved - Emitted with the form data when the user clicks Save
 * @param cancelled - Emitted when the user clicks Cancel
 */
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MessagingProvider } from 'src/app/domain/models/messaging/messaging-provider.model';
import { CreateMessagingProvider } from 'src/app/domain/models/messaging/create-messaging-provider.model';

const PROVIDER_TYPES = ['WhatsApp', 'Telegram', 'Signal', 'SMS'] as const;

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
  @Output() saved = new EventEmitter<CreateMessagingProvider>();
  @Output() cancelled = new EventEmitter<void>();

  name = '';
  displayName = '';
  providerType = 'WhatsApp';
  configJson = '';
  isEnabled = true;

  readonly providerTypes = PROVIDER_TYPES;

  ngOnInit(): void {
    if (this.provider) {
      this.name = this.provider.name;
      this.displayName = this.provider.displayName;
      this.providerType = this.provider.providerType;
      this.configJson = '';
      this.isEnabled = this.provider.isEnabled;
    }
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
      configJson: this.configJson,
      isEnabled: this.isEnabled,
    };
    this.saved.emit(dto);
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
