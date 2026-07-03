// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * DTOs and expiry constants for ERP import tokens (upload credentials scoped to a single drop point).
 * @param IErpImportToken - Token metadata as returned by the list endpoint (no secret)
 * @param IErpImportTokenCreate - Create request with drop point id, name and optional expiry in days
 * @param IErpImportTokenCreated - Create response carrying the plaintext token exactly once
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

export interface IErpImportTokenCreate {
  dropPointId: string;
  name: string;
  expiresInDays?: number;
}

export interface IErpImportTokenCreated {
  id: string;
  dropPointId: string;
  name: string;
  tokenPrefix: string;
  expiresAt: string;
  token: string;
}
