// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service managing the active locale for the application.
 * Initializes from browser language, can be overridden via setLocale().
 */
import { Injectable, signal } from '@angular/core';

import { DomainMessages } from 'src/app/domain/constants/messages';
@Injectable({ providedIn: 'root' })
export class LocaleService {
  public locale = signal<string>(LocaleService.detectBrowserLanguage());

  setLocale(locale: string) {
    this.locale.set(locale);
  }

  getLocale(): string {
    return this.locale();
  }

  static detectBrowserLanguage(): string {
    const browserLang = navigator.language || navigator.languages?.[0] || DomainMessages.DEFAULT_LANG;
    return browserLang.split('-')[0].toLowerCase();
  }
}
