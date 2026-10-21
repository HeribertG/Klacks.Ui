// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAssistantProvider {
  id: string;
  providerId: string;
  providerName: string;
  isEnabled: boolean;
  hasApiKey?: boolean;
  requiresApiKey?: boolean;
  apiKey?: string;
  baseUrl?: string;
  apiVersion?: string;
  priority: number;
}
