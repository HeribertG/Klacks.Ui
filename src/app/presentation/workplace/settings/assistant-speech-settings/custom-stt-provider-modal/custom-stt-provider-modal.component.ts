// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modal dialog for creating or editing a custom STT provider.
 * @param provider - The provider to edit (null for create mode)
 * @param save - Output event emitted with the provider data when the user saves
 * @param close - Output event emitted when the modal is closed without saving
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CustomSttProvider } from 'src/app/infrastructure/api/assistant/data-custom-stt-provider.service';

@Component({
  selector: 'app-custom-stt-provider-modal',
  templateUrl: './custom-stt-provider-modal.component.html',
  styleUrls: ['./custom-stt-provider-modal.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomSttProviderModalComponent implements OnInit {
  provider = input<CustomSttProvider | null>(null);
  providerSaved = output<CustomSttProvider>();
  dismissed = output<void>();

  name = '';
  connectionType = 'rest';
  apiUrl = '';
  apiKey = '';
  languageModel = '';
  isEnabled = false;

  ngOnInit(): void {
    const p = this.provider();
    if (p) {
      this.name = p.name;
      this.connectionType = p.connectionType;
      this.apiUrl = p.apiUrl;
      this.apiKey = '';
      this.languageModel = p.languageModel ?? '';
      this.isEnabled = p.isEnabled;
    }
  }

  onSave(): void {
    if (!this.name.trim() || !this.apiUrl.trim()) return;

    const existing = this.provider();
    this.providerSaved.emit({
      id: existing?.id ?? '',
      name: this.name,
      connectionType: this.connectionType,
      apiUrl: this.apiUrl,
      apiKey: this.apiKey || null,
      languageModel: this.languageModel || null,
      isEnabled: this.isEnabled,
      isSystem: existing?.isSystem ?? false,
    });
  }

  onClose(): void {
    this.dismissed.emit();
  }
}
