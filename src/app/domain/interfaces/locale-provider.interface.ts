// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Read access to the active application language for layers that must not depend on the application layer
 * (domain services, shared pipes, infrastructure formatters), and the token through which it is provided.
 * @param getLocale - Returns the active application language code, e.g. 'de', 'es' or 'zh-TW'
 */
import { InjectionToken } from '@angular/core';

export interface ILocaleProvider {
  getLocale(): string;
}

export const LOCALE_PROVIDER = new InjectionToken<ILocaleProvider>('ILocaleProvider');
