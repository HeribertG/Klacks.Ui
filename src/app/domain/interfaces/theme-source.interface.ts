// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Read access to the active colour theme for domain services that re-read theme-dependent values, and the token
 * through which it is provided.
 * @param theme - Signal holding the name of the active theme; it changes whenever the user switches the theme
 */
import { InjectionToken, Signal } from '@angular/core';

export interface IThemeSource {
  readonly theme: Signal<string>;
}

export const THEME_SOURCE = new InjectionToken<IThemeSource>('IThemeSource');
