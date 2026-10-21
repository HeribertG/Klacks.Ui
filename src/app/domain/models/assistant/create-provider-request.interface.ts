// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ICreateProviderRequest {
  providerId: string;
  providerName: string;
  apiKey?: string;
  baseUrl?: string;
  apiVersion?: string;
  isEnabled: boolean;
  priority: number;
  requiresApiKey?: boolean;
}
