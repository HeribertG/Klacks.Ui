// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, inject, OnInit, signal, effect } from '@angular/core';
import { form } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { PasswordInputComponent } from 'src/app/presentation/shared/password-input/password-input.component';

@Component({
  selector: 'app-openroute',
  standalone: true,
  imports: [TranslateModule, PasswordInputComponent],
  templateUrl: './openroute.component.html',
  styleUrls: ['./openroute.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenrouteComponent implements OnInit {
  private appSettingsManagementService = inject(AppSettingsManagementService);

  private isInitialized = false;
  private apiKeyModel = signal({ apiKey: '' });
  apiKeyForm = form(this.apiKeyModel);

  constructor() {
    effect(() => {
      const apiKey = this.apiKeyModel().apiKey;
      if (this.isInitialized) {
        this.appSettingsManagementService.openRouteServiceApiKey.set(apiKey);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.appSettingsManagementService.loadSettingsAsync();
    this.apiKeyModel.set({ apiKey: this.appSettingsManagementService.openRouteServiceApiKey() });
    this.isInitialized = true;
  }

}
