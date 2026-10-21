// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface CustomSttProvider {
  id: string;
  name: string;
  connectionType: string;
  apiUrl: string;
  apiKey: string | null;
  languageModel: string | null;
  isEnabled: boolean;
  isSystem: boolean;
}
