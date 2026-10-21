// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * DTOs and expiry constants for ERP import tokens (upload credentials scoped to a single drop point).
 * @param IErpImportToken - Token metadata as returned by the list endpoint (no secret)
 */

export const ERP_IMPORT_TOKEN_EXPIRY = {
  MIN_DAYS: 1,
  MAX_DAYS: 730,
  DEFAULT_DAYS: 365,
} as const;

export interface IErpImportToken {
  id: string;
  dropPointId: string;
  name: string;
  tokenPrefix: string;
  expiresAt?: string;
  lastUsedAt?: string;
}
