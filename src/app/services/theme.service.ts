// theme.service.ts
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private localStorageService = inject(LocalStorageService);
  private themeSubject = new BehaviorSubject<'light' | 'dark'>(
    (this.localStorageService.get('theme') as 'light' | 'dark') ?? 'light'
  );

  theme$ = this.themeSubject.asObservable();

  constructor(private localStorage: LocalStorageService) {}

  setTheme(mode: 'light' | 'dark') {
    this.localStorage.set('theme', mode);
    document.documentElement.setAttribute('data-theme', mode);
    this.themeSubject.next(mode);
  }

  getCurrentTheme(): 'light' | 'dark' {
    return this.themeSubject.value;
  }
}
