// locale.service.ts
import { Injectable, signal } from '@angular/core';

export type SupportedLocales = 'en' | 'de' | 'fr' | 'it';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  public locale = signal<string>('en');

  setLocale(locale: string) {
    this.locale.set(locale);
  }

  getLocale(): string {
    return this.locale();
  }
}
