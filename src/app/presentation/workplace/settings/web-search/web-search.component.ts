// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for configuring the web search provider used by the assistant's web search skill.
 * Signal-based form for provider selection, API key and max results, autosaved through AppSettingsManagementService.
 */

import { Component, ChangeDetectionStrategy, inject, OnInit, signal, effect } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { PasswordInputComponent } from 'src/app/presentation/shared/password-input/password-input.component';
import { WebSearchProvider } from 'src/app/domain/constants/web-search-provider.constants';

const DEFAULT_MAX_RESULTS = 5;
const MIN_MAX_RESULTS = 1;
const MAX_MAX_RESULTS = 20;

interface IWebSearchModel {
  provider: string;
  apiKey: string;
  maxResults: number;
}

@Component({
  selector: 'app-web-search',
  standalone: true,
  imports: [TranslateModule, PasswordInputComponent, FormField],
  templateUrl: './web-search.component.html',
  styleUrls: ['./web-search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebSearchComponent implements OnInit {
  private appSettingsManagementService = inject(AppSettingsManagementService);

  private isInitialized = false;
  private webSearchModel = signal<IWebSearchModel>({ provider: WebSearchProvider.Serper, apiKey: '', maxResults: DEFAULT_MAX_RESULTS });
  webSearchForm = form(this.webSearchModel);

  constructor() {
    effect(() => {
      const model = this.webSearchModel();
      const clamped = Math.max(MIN_MAX_RESULTS, Math.min(MAX_MAX_RESULTS, model.maxResults));
      if (clamped !== model.maxResults) {
        this.webSearchModel.update(m => ({ ...m, maxResults: clamped }));
        return;
      }
      if (this.isInitialized) {
        this.appSettingsManagementService.webSearchProvider.set(model.provider);
        this.appSettingsManagementService.webSearchApiKey.set(model.apiKey);
        this.appSettingsManagementService.webSearchMaxResults.set(model.maxResults.toString());
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.appSettingsManagementService.loadSettingsAsync();
    const storedMaxResults = parseInt(this.appSettingsManagementService.webSearchMaxResults(), 10);
    this.webSearchModel.set({
      provider: this.appSettingsManagementService.webSearchProvider() || WebSearchProvider.Serper,
      apiKey: this.appSettingsManagementService.webSearchApiKey(),
      maxResults: Number.isNaN(storedMaxResults) ? DEFAULT_MAX_RESULTS : storedMaxResults,
    });
    this.isInitialized = true;
  }

}
