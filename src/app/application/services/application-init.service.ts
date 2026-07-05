// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DataLoadFileService } from '../../infrastructure/api/data-load-file.service';
import { DataSettingsVariousService } from '../../infrastructure/api/settings/data-settings-various.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { AppSetting, ISetting } from 'src/app/domain/models/settings/settings-various-class';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApplicationInitService {
  private titleService = inject(Title);
  private dataSettingsVariousService = inject(DataSettingsVariousService);
  private dataLoadFileService = inject(DataLoadFileService);
  private localStorageService = inject(LocalStorageService);
  private assistantService = inject(DataManagementAssistantService);
  private authorizationService = inject(AuthorizationService);
  private destroy$ = new Subject<void>();

  public initialize(): void {
    // This is now called after login from HomeComponent
    this.loadIconsAndTitle();
    
    // Initialize LLM models after successful authentication
    this.assistantService.initializeAssistantModels();
  }

  public initializeBasics(): void {
    // Basic settings that don't require authentication
    this.setDefaults();
    this.setTheme();
  }

  private setDefaults(): void {
    if (!this.localStorageService.get(StorageKeys.CURRENT_LANG)) {
      this.localStorageService.set(
        StorageKeys.CURRENT_LANG,
        DomainMessages.DEFAULT_LANG
      );
    }
  }

  private setTheme(): void {
    const currentTheme = localStorage.getItem('theme')
      ? localStorage.getItem('theme')
      : null;
    if (currentTheme) {
      document.documentElement.setAttribute('data-theme', currentTheme);
    }
  }

  private loadIconsAndTitle(): void {
    // Load icons and logos
    this.dataLoadFileService.downLoadIcon();
    this.dataLoadFileService.downLoadLogo();

    // Set application title from settings (Admin-only endpoint, non-admins keep the default title)
    if (!this.authorizationService.isAdmin) {
      return;
    }

    this.dataSettingsVariousService.readSettingList().pipe(takeUntil(this.destroy$)).subscribe({
      next: (l) => {
        if (l) {
          const tmp = l as ISetting[];
          const title = tmp.find((x) => x.type === AppSetting.APP_NAME);
          if (title && title.value) {
            this.titleService.setTitle(title.value);
          }
        }
      },
      error: (e) => console.error('Error loading application title:', e),
    });
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}