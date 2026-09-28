// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface LanguagePluginInfo {
  code: string;
  name: string;
  displayName: string;
  speechLocale: string;
  version: string;
  author: string;
  coverage: number;
  isInstalled: boolean;
  isCore: boolean;
  translationCount: number;
}
