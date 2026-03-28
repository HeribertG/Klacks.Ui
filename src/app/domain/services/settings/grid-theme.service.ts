// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { ThemeMode, ThemeService } from 'src/app/presentation/services/theme.service';

const GRID_THEME_DEFAULTS: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    '--gridContainerBackground': '#424949',
    '--gridHeaderBackground': '#d5dbdb',
    '--gridHeaderColor': '#4d4d4d',
    '--gridHeaderBorderColor': '#d5dbdb',
    '--gridRowHeaderColor': '#000000',
  },
  dark: {
    '--gridContainerBackground': '#2c3e50',
    '--gridHeaderBackground': '#34495e',
    '--gridHeaderColor': '#ecf0f1',
    '--gridHeaderBorderColor': '#2c3e50',
    '--gridRowHeaderColor': '#ecf0f1',
  },
};

@Injectable({ providedIn: 'root' })
export class GridThemeService {
  private themeService = inject(ThemeService);

  readonly containerBackground = signal<string>(GRID_THEME_DEFAULTS.light['--gridContainerBackground']);
  readonly headerBackground = signal<string>(GRID_THEME_DEFAULTS.light['--gridHeaderBackground']);
  readonly headerColor = signal<string>(GRID_THEME_DEFAULTS.light['--gridHeaderColor']);
  readonly headerBorderColor = signal<string>(GRID_THEME_DEFAULTS.light['--gridHeaderBorderColor']);
  readonly rowHeaderColor = signal<string>(GRID_THEME_DEFAULTS.light['--gridRowHeaderColor']);

  constructor() {
    effect(() => {
      const theme = this.themeService.theme();
      untracked(() => this.applyTheme(theme));
    });
  }

  private applyTheme(theme: ThemeMode): void {
    const key: 'light' | 'dark' = theme === 'dark' || theme === 'oled' ? 'dark' : 'light';
    const defaults = GRID_THEME_DEFAULTS[key];
    const style = document.documentElement.style;

    for (const [prop, value] of Object.entries(defaults)) {
      style.setProperty(prop, value);
    }

    this.containerBackground.set(defaults['--gridContainerBackground']);
    this.headerBackground.set(defaults['--gridHeaderBackground']);
    this.headerColor.set(defaults['--gridHeaderColor']);
    this.headerBorderColor.set(defaults['--gridHeaderBorderColor']);
    this.rowHeaderColor.set(defaults['--gridRowHeaderColor']);
  }
}
