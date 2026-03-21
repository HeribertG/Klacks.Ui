// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectorRef, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';

import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { TranslateStringConstantsService } from 'src/app/application/translate/translate-string-constants.service';
import { ThemeService } from 'src/app/presentation/services/theme.service';
import { LanguageConfigService } from 'src/app/application/services/language-config.service';

@Component({
  selector: 'app-profile-custom-setting',
  templateUrl: './profile-custom-setting.component.html',
  styleUrls: ['./profile-custom-setting.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    NgbModule,
    SpinnerModule
],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileCustomSettingComponent implements OnInit {
  isChecked = false;

  selectedLanguage: Language = DomainMessages.DEFAULT_LANG;

  public translate = inject(TranslateService);
  private translateStringConstantsService = inject(
    TranslateStringConstantsService
  );
  private localStorageService = inject(LocalStorageService);
  private localeService = inject(LocaleService);
  private themeService = inject(ThemeService);
  private languageConfigService = inject(LanguageConfigService);
  private cdr = inject(ChangeDetectorRef);

  get languages(): Language[] {
    return this.languageConfigService.getSupportedLanguages() as Language[];
  }

  getDisplayName(lang: string): string {
    return this.languageConfigService.getDisplayName(lang);
  }

  ngOnInit(): void {
    const lang =
      this.localStorageService.get(StorageKeys.CURRENT_LANG) !== null;

    if (lang) {
      this.onChangeLanguage(
        this.localStorageService.get(StorageKeys.CURRENT_LANG) as string
      );
    }
    this.setTheme();
  }

  onChange() {
    setTimeout(() => {
      this.onChangeLanguage(this.selectedLanguage);
      this.cdr.markForCheck();
    }, 100);
  }

  onChangeLanguage(lang: string) {
    this.selectedLanguage = lang as Language;
    this.translate.use(lang);
    this.localStorageService.set(StorageKeys.CURRENT_LANG, lang);
    this.translateStringConstantsService.translate();
    this.localeService.setLocale(lang);
  }

  onDarkModeChecked(): void {
    const mode = this.isChecked ? 'dark' : 'light';
    this.themeService.setTheme(mode);
    this.isChecked
      ? document.documentElement.setAttribute('data-theme', 'dark')
      : document.documentElement.setAttribute('data-theme', 'light');
  }

  setTheme(): void {
    const currentTheme = this.localStorageService.get('theme')
      ? this.localStorageService.get('theme')
      : null;
    if (currentTheme === 'dark') {
      this.isChecked = true;
    }
  }
}
