import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { form, Field } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';

@Component({
  selector: 'app-deepl',
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule, Field],
  templateUrl: './deepl.component.html',
  styleUrls: ['./deepl.component.scss'],
})
export class DeeplComponent implements OnInit {
  public translate = inject(TranslateService);
  private appSettingsManagementService = inject(AppSettingsManagementService);

  public faEye = faEye;
  public faEyeSlash = faEyeSlash;
  public showApiKey = signal(false);

  private isInitialized = false;
  private apiKeyModel = signal({ apiKey: '' });
  apiKeyForm = form(this.apiKeyModel);

  constructor() {
    effect(() => {
      const apiKey = this.apiKeyModel().apiKey;
      if (this.isInitialized) {
        this.appSettingsManagementService.deeplApiKey.set(apiKey);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.appSettingsManagementService.loadSettingsAsync();
    this.apiKeyModel.set({ apiKey: this.appSettingsManagementService.deeplApiKey() });
    this.isInitialized = true;
  }

  toggleShowApiKey(): void {
    this.showApiKey.update(v => !v);
  }
}
