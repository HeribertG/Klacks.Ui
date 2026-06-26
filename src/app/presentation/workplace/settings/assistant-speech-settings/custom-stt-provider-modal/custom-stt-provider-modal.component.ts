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
  signal,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { CustomSttProvider } from 'src/app/infrastructure/api/assistant/data-custom-stt-provider.service';

interface CustomSttProviderFormModel {
  name: string;
  connectionType: string;
  apiUrl: string;
  apiKey: string;
  languageModel: string;
  isEnabled: boolean;
}

@Component({
  selector: 'app-custom-stt-provider-modal',
  templateUrl: './custom-stt-provider-modal.component.html',
  styleUrls: ['./custom-stt-provider-modal.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomSttProviderModalComponent implements OnInit {
  provider = input<CustomSttProvider | null>(null);
  providerSaved = output<CustomSttProvider>();
  dismissed = output<void>();

  private readonly formModel = signal<CustomSttProviderFormModel>({
    name: '',
    connectionType: 'rest',
    apiUrl: '',
    apiKey: '',
    languageModel: '',
    isEnabled: false,
  });
  protected readonly providerForm = form(this.formModel);

  ngOnInit(): void {
    const p = this.provider();
    if (p) {
      this.formModel.set({
        name: p.name,
        connectionType: p.connectionType,
        apiUrl: p.apiUrl,
        apiKey: '',
        languageModel: p.languageModel ?? '',
        isEnabled: p.isEnabled,
      });
    }
  }

  onSave(): void {
    const model = this.formModel();
    if (!model.name.trim() || !model.apiUrl.trim()) return;

    const existing = this.provider();
    this.providerSaved.emit({
      id: existing?.id ?? '',
      name: model.name,
      connectionType: model.connectionType,
      apiUrl: model.apiUrl,
      apiKey: model.apiKey || null,
      languageModel: model.languageModel || null,
      isEnabled: model.isEnabled,
      isSystem: existing?.isSystem ?? false,
    });
  }

  onClose(): void {
    this.dismissed.emit();
  }
}
