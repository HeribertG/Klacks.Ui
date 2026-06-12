// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * DTOs and expiry constants for personal access tokens.
 * @param IPersonalAccessToken - Token metadata as returned by the list endpoint (no secret)
 * @param IPersonalAccessTokenCreate - Create request with name and optional expiry in days
 * @param IPersonalAccessTokenCreated - Create response carrying the plaintext token exactly once
 */

export const PERSONAL_ACCESS_TOKEN_EXPIRY = {
  MIN_DAYS: 1,
  MAX_DAYS: 730,
  DEFAULT_DAYS: 365,
} as const;

export interface IPersonalAccessToken {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt?: string;
  expiresAt?: string;
  lastUsedAt?: string;
}

export interface IPersonalAccessTokenCreate {
  name: string;
  expiresInDays?: number;
}

export interface IPersonalAccessTokenCreated {
  id: string;
  name: string;
  tokenPrefix: string;
  expiresAt: string;
  token: string;
}
