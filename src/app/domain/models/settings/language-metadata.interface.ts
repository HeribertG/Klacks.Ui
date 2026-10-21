// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface LanguageMetadata {
  name: string;
  displayName: string;
  speechLocale: string;
  direction?: 'ltr' | 'rtl';
}
