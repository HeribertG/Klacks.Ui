import { Component, OnInit } from '@angular/core';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import {
  LocaleService,
  SupportedLocales,
} from 'src/app/services/locale.service';
import { TranslateStringConstantsService } from 'src/app/translate/translate-string-constants.service';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IconsModule } from 'src/app/icons/icons.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { SpinnerModule } from 'src/app/spinner/spinner.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-profile-custom-setting',
  templateUrl: './profile-custom-setting.component.html',
  styleUrls: ['./profile-custom-setting.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgbModule,
    IconsModule,
    SharedModule,
    SpinnerModule,
    TranslateModule,
    FontAwesomeModule,
  ],
})
export class ProfileCustomSettingComponent implements OnInit {
  isChecked = false;

  languages: Language[] = ['de', 'fr', 'it', 'en'];
  selectedLanguage: Language = MessageLibrary.DEFAULT_LANG;
  flagMap: Record<Language, string> = {
    de: 'Deutsch',
    fr: 'Français',
    it: 'Italiano',
    en: 'English',
  };

  constructor(
    private translateService: TranslateService,
    private translateStringConstantsService: TranslateStringConstantsService,
    private localStorageService: LocalStorageService,
    private localeService: LocaleService
  ) {}

  ngOnInit(): void {
    const lang =
      this.localStorageService.get(MessageLibrary.CURRENT_LANG) !== null;

    if (lang) {
      this.onChangeLanguage(
        this.localStorageService.get(MessageLibrary.CURRENT_LANG) as string
      );
    }
    this.setTheme();
  }

  onChange() {
    setTimeout(() => {
      this.onChangeLanguage(this.selectedLanguage);
    }, 100);
  }

  onChangeLanguage(lang: string) {
    this.selectedLanguage = lang as Language;
    this.translateService.use(lang);
    this.localStorageService.set(MessageLibrary.CURRENT_LANG, lang);
    this.translateStringConstantsService.translate();
    this.localeService.setLocale(lang as SupportedLocales);
  }

  onDarkModeChecked(): void {
    if (this.isChecked) {
      document.documentElement.setAttribute('data-theme', 'dark');
      this.localStorageService.set('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      this.localStorageService.set('theme', 'light');
    }
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
