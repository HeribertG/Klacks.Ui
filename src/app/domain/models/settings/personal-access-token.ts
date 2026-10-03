// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * DTOs, expiry and access-mode constants for personal access tokens.
 * @param IPersonalAccessToken - Token metadata as returned by the list endpoint (no secret)
 * @param IPersonalAccessTokenCreate - Create request with name, optional expiry in days and access mode
 * @param PERSONAL_ACCESS_TOKEN_ACCESS_MODE - Read (only read-only tools) or Write (tools may change data)
 * @param IPersonalAccessTokenCreated - Create response carrying the plaintext token exactly once
 */

export const PERSONAL_ACCESS_TOKEN_EXPIRY = {
  MIN_DAYS: 1,
  MAX_DAYS: 730,
  DEFAULT_DAYS: 365,
} as const;

export const PERSONAL_ACCESS_TOKEN_ACCESS_MODE = {
  READ: 'Read',
  WRITE: 'Write',
} as const;

export type PersonalAccessTokenAccessMode =
  (typeof PERSONAL_ACCESS_TOKEN_ACCESS_MODE)[keyof typeof PERSONAL_ACCESS_TOKEN_ACCESS_MODE];

export const PERSONAL_ACCESS_TOKEN_DEFAULT_ACCESS_MODE: PersonalAccessTokenAccessMode =
  PERSONAL_ACCESS_TOKEN_ACCESS_MODE.READ;

export interface IPersonalAccessToken {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt?: string;
  expiresAt?: string;
  lastUsedAt?: string;
  accessMode: PersonalAccessTokenAccessMode;
}

export interface IPersonalAccessTokenCreate {
  name: string;
  expiresInDays?: number;
  accessMode: PersonalAccessTokenAccessMode;
}

export interface IPersonalAccessTokenCreated {
  id: string;
  name: string;
  tokenPrefix: string;
  expiresAt: string;
  token: string;
  accessMode: PersonalAccessTokenAccessMode;
}
