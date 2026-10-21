// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Provider candidate returned by the discovery endpoint (catalog or web search).
 * Enum values mirror the backend integer serialization order.
 */

import { ProviderCandidateSource } from './provider-candidate-source.enum';
import { ProviderConnectivityStatus } from './provider-connectivity-status.enum';

export interface IDiscoveredProvider {
  providerId: string;
  providerName: string;
  baseUrl: string;
  apiVersion?: string | null;
  requiresApiKey: boolean;
  docsUrl?: string | null;
  source: ProviderCandidateSource;
  connectivity: ProviderConnectivityStatus;
}
