// locale.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type SupportedLocales = 'en' | 'de' | 'fr' | 'it';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private localeSubject = new BehaviorSubject<string>('en');
  locale$ = this.localeSubject.asObservable();

  setLocale(locale: string) {
    this.localeSubject.next(locale);
  }

  getLocale(): string {
    return this.localeSubject.value;
  }
}
