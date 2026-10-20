// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads grid header/container colors from CSS variables (set by colors.scss themes).
 * @param themeSource - Provides the current theme signal to trigger re-reads on theme change
 */
import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { THEME_SOURCE } from 'src/app/domain/interfaces/theme-source.interface';

@Injectable({ providedIn: 'root' })
export class GridThemeService {
  private themeSource = inject(THEME_SOURCE);

  readonly containerBackground = signal<string>('#424949');
  readonly headerBackground = signal<string>('#d5dbdb');
  readonly headerColor = signal<string>('#4d4d4d');
  readonly headerBorderColor = signal<string>('#d5dbdb');
  readonly rowHeaderColor = signal<string>('#000000');

  constructor() {
    effect(() => {
      this.themeSource.theme();
      untracked(() => {
        requestAnimationFrame(() => this.readFromCssVariables());
      });
    });
  }

  private readFromCssVariables(): void {
    const style = getComputedStyle(document.documentElement);

    const read = (prop: string, fallback: string): string => {
      const val = style.getPropertyValue(prop).trim();
      return val || fallback;
    };

    this.containerBackground.set(read('--gridContainerBackground', '#424949'));
    this.headerBackground.set(read('--gridHeaderBackground', '#d5dbdb'));
    this.headerColor.set(read('--gridHeaderColor', '#4d4d4d'));
    this.headerBorderColor.set(read('--gridHeaderBorderColor', '#d5dbdb'));
    this.rowHeaderColor.set(read('--gridRowHeaderColor', '#000000'));
  }
}
