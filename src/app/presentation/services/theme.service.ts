// Copyright (c) Heribert Gasparoli Private. All rights reserved.

// theme.service.ts
import { inject, Injectable, signal } from '@angular/core';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private localStorageService = inject(LocalStorageService);

  public theme = signal<'light' | 'dark'>(
    (this.localStorageService.get('theme') as 'light' | 'dark') ?? 'light'
  );

  constructor() {
    document.documentElement.setAttribute('data-theme', this.theme());
  }

  setTheme(mode: 'light' | 'dark') {
    this.localStorageService.set('theme', mode);
    document.documentElement.setAttribute('data-theme', mode);
    this.theme.set(mode);
  }

  getCurrentTheme(): 'light' | 'dark' {
    return this.theme();
  }
}
