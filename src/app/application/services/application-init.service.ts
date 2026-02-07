import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DataLoadFileService } from '../../infrastructure/api/data-load-file.service';
import { DataSettingsVariousService } from '../../infrastructure/api/settings/data-settings-various.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { AppSetting, ISetting } from 'src/app/domain/models/settings-various-class';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { DataManagementLLMService } from 'src/app/domain/services/llm/data-management-llm.service';
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
  private llmService = inject(DataManagementLLMService);
  private destroy$ = new Subject<void>();

  public initialize(): void {
    // This is now called after login from HomeComponent
    this.loadIconsAndTitle();
    
    // Initialize LLM models after successful authentication
    this.llmService.initializeLLMModels();
  }

  public initializeBasics(): void {
    // Basic settings that don't require authentication
    this.setDefaults();
    this.setTheme();
  }

  private setDefaults(): void {
    if (!this.localStorageService.get(MessageLibrary.CURRENT_LANG)) {
      this.localStorageService.set(
        MessageLibrary.CURRENT_LANG,
        MessageLibrary.DEFAULT_LANG
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

    // Set application title from settings
    try {
      this.dataSettingsVariousService.readSettingList().pipe(takeUntil(this.destroy$)).subscribe((l) => {
        if (l) {
          const tmp = l as ISetting[];
          const title = tmp.find((x) => x.type === AppSetting.APP_NAME);
          if (title && title.value) {
            this.titleService.setTitle(title.value);
          }
        }
      });
    } catch (e) {
      console.log('Error loading application title:', e);
    }
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}