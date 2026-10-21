// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface LLMProviderFormModel {
  providerId: string;
  providerName: string;
  baseUrl: string;
  apiVersion: string;
  priority: string;
  providerApiKey: string;
  isEnabled: boolean;
  requiresApiKey: boolean;
}
