// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for managing the application theme.
 * @param theme - Signal holding the current ThemeMode
 */
import { inject, Injectable, signal } from '@angular/core';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

export type ThemeMode = 'light' | 'dark' | 'high-contrast' | 'blue' | 'warm' | 'oled' | 'dimmed';

export const AVAILABLE_THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'high-contrast', label: 'High Contrast' },
  { value: 'blue', label: 'Blue' },
  { value: 'warm', label: 'Warm' },
  { value: 'oled', label: 'OLED Dark' },
  { value: 'dimmed', label: 'Dimmed' },
];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private localStorageService = inject(LocalStorageService);

  public theme = signal<ThemeMode>(
    (this.localStorageService.get('theme') as ThemeMode) ?? 'light'
  );

  constructor() {
    document.documentElement.setAttribute('data-theme', this.theme());
  }

  setTheme(mode: ThemeMode) {
    this.localStorageService.set('theme', mode);
    document.documentElement.setAttribute('data-theme', mode);
    this.theme.set(mode);
  }

  getCurrentTheme(): ThemeMode {
    return this.theme();
  }
}
