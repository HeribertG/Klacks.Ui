// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Settings card for selecting the application theme and display language.
 */
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Language } from 'src/app/domain/models/settings/language.type';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { DisplayLanguageService } from 'src/app/application/services/display-language.service';
import { AVAILABLE_THEMES, ThemeService } from 'src/app/presentation/services/theme.service';
import { ThemeMode } from 'src/app/presentation/services/theme-mode.type';
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

  private displayLanguageService = inject(DisplayLanguageService);
  private themeService = inject(ThemeService);
  private languageConfigService = inject(LanguageConfigService);

  constructor() {
    const savedLang = this.displayLanguageService.savedSupportedLanguage();
    if (savedLang) {
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
    this.displayLanguageService.switchTo(lang);
  }

  onThemeChanged(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ThemeMode;
    this.selectedTheme.set(value);
    this.themeService.setTheme(value);
  }
}
