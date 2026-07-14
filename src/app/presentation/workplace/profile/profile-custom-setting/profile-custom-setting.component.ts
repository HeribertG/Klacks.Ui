// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for selecting the application theme and display language.
 */
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { TranslateStringConstantsService } from 'src/app/application/translate/translate-string-constants.service';
import { AVAILABLE_THEMES, ThemeMode, ThemeService } from 'src/app/presentation/services/theme.service';
import { LanguageConfigService } from 'src/app/application/services/language-config.service';

@Component({
  selector: 'app-profile-custom-setting',
  templateUrl: './profile-custom-setting.component.html',
  styleUrls: ['./profile-custom-setting.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileCustomSettingComponent {
  public selectedTheme = signal<ThemeMode>('light');
  public selectedLanguage = signal<Language>(DomainMessages.DEFAULT_LANG);
  public readonly themes = AVAILABLE_THEMES;

  private translateService = inject(TranslateService);
  private translateStringConstantsService = inject(TranslateStringConstantsService);
  private localStorageService = inject(LocalStorageService);
  private localeService = inject(LocaleService);
  private themeService = inject(ThemeService);
  private languageConfigService = inject(LanguageConfigService);

  constructor() {
    const savedLang = this.localStorageService.get(StorageKeys.CURRENT_LANG);
    if (savedLang && this.languageConfigService.isLanguageSupported(savedLang)) {
      this.onChangeLanguage(savedLang);
    }
    this.selectedTheme.set(this.themeService.getCurrentTheme());
  }

  get languages(): Language[] {
    return this.languageConfigService.getSupportedLanguages() as Language[];
  }

  getDisplayName(lang: string): string {
    return this.languageConfigService.getDisplayName(lang);
  }

  onChangeLanguage(lang: string): void {
    this.selectedLanguage.set(lang as Language);
    this.translateService.use(lang);
    this.localStorageService.set(StorageKeys.CURRENT_LANG, lang);
    this.translateStringConstantsService.translate();
    this.localeService.setLocale(lang);
  }

  onThemeChanged(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ThemeMode;
    this.selectedTheme.set(value);
    this.themeService.setTheme(value);
  }
}
