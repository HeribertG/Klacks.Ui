// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Provider candidate returned by the discovery endpoint (catalog or web search).
 * Enum values mirror the backend integer serialization order.
 */

export enum ProviderCandidateSource {
  Catalog = 0,
  Web = 1,
}

export enum ProviderConnectivityStatus {
  Unknown = 0,
  Reachable = 1,
  ReachableNeedsKey = 2,
  Unreachable = 3,
}

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
