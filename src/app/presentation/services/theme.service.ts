// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for managing the application theme. On first run (no theme stored yet), it
 * adopts the browser's prefers-color-scheme once and persists it, so later OS/browser
 * theme changes no longer affect an already-established user preference.
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

const THEME_STORAGE_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private localStorageService = inject(LocalStorageService);

  public theme = signal<ThemeMode>(this.resolveInitialTheme());

  constructor() {
    document.documentElement.setAttribute('data-theme', this.theme());
    if (!this.localStorageService.get(THEME_STORAGE_KEY)) {
      this.localStorageService.set(THEME_STORAGE_KEY, this.theme());
    }
  }

  private resolveInitialTheme(): ThemeMode {
    const stored = this.localStorageService.get(THEME_STORAGE_KEY) as ThemeMode | null;
    if (stored) {
      return stored;
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  setTheme(mode: ThemeMode) {
    this.localStorageService.set(THEME_STORAGE_KEY, mode);
    document.documentElement.setAttribute('data-theme', mode);
    this.theme.set(mode);
  }

  getCurrentTheme(): ThemeMode {
    return this.theme();
  }
}
