// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface CustomSttProviderInfo {
  id: string;
  name: string;
  connectionType: string;
  apiUrl: string;
  languageModel: string | null;
  isEnabled: boolean;
  isSystem: boolean;
}
