// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * DTOs, expiry and access-mode constants for personal access tokens.
 * @param IPersonalAccessToken - Token metadata as returned by the list endpoint (no secret)
 * @param PERSONAL_ACCESS_TOKEN_ACCESS_MODE - Read (only read-only tools) or Write (tools may change data)
 */

import { PersonalAccessTokenAccessMode } from './personal-access-token-access-mode.type';

export const PERSONAL_ACCESS_TOKEN_EXPIRY = {
  MIN_DAYS: 1,
  MAX_DAYS: 730,
  DEFAULT_DAYS: 365,
} as const;

export const PERSONAL_ACCESS_TOKEN_ACCESS_MODE = {
  READ: 'Read',
  WRITE: 'Write',
} as const;

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
