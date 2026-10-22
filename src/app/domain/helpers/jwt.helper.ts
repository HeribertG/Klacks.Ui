// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * JWT Helper
 *
 * Pure functions for inspecting JWT access tokens.
 */

import { IJwtPayload } from 'src/app/domain/models/auth/jwt-payload.interface';

export const DEFAULT_TOKEN_EXPIRY_BUFFER_MS = 30000;

/**
 * Decodes the claims payload of a JWT access token.
 *
 * @param token - Encoded JWT access token
 * @returns The decoded claims object, or null if the token is unreadable
 */
export function decodeJwtPayload(token: string): IJwtPayload | null {
  try {
    const payload = token.split('.')[1];
    return payload ? (JSON.parse(atob(payload)) as IJwtPayload) : null;
  } catch {
    return null;
  }
}

/**
 * Checks whether a JWT is expired, or will expire within the given buffer.
 *
 * @param token - Encoded JWT access token
 * @param bufferMs - Milliseconds before the actual expiry to already treat the token as expired
 * @returns true if the token is expired, unreadable, or has no readable payload
 */
export function isJwtExpired(token: string, bufferMs: number = DEFAULT_TOKEN_EXPIRY_BUFFER_MS): boolean {
  const decoded = decodeJwtPayload(token);
  if (!decoded) {
    return true;
  }
  if (!decoded.exp) {
    return false;
  }
  return Date.now() > decoded.exp * 1000 - bufferMs;
}
