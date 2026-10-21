// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface CustomSttProviderFormModel {
  name: string;
  connectionType: string;
  apiUrl: string;
  apiKey: string;
  languageModel: string;
  isEnabled: boolean;
}
