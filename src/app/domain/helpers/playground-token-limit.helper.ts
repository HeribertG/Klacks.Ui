// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure helpers of the public playground: maps the playground error codes to their translated message, recognises
 * the LLM endpoints of the own API that carry the device token, validates the shape of a device token and decides
 * which status failures leave the playground state unknown.
 * @param code - Machine-readable errorCode of a problem body or SSE error chunk
 * @param status - HTTP status of the failed response
 * @param error - A failed HTTP response (status field) or any other thrown value such as a timeout
 * @param token - A device token candidate, e.g. read back from local storage
 * @param url - Request URL, absolute or relative, with or without query string
 * @param apiBase - Configured API base URL (absolute or relative); only URLs below it are the own API
 * @param pageOrigin - Origin of the page, used to resolve relative URLs
 */
import {
  ASSISTANT_API_SEGMENT,
  PLAYGROUND_DEVICE_TOKEN_MAX_LENGTH,
  PLAYGROUND_DEVICE_TOKEN_MIN_LENGTH,
  PLAYGROUND_DEVICE_TOKEN_PATTERN,
  PLAYGROUND_ERROR_HTTP_STATUSES,
  PLAYGROUND_ERROR_I18N_KEYS,
  PLAYGROUND_LLM_PATH_SEGMENTS,
  PLAYGROUND_SERVER_ERROR_MIN_STATUS,
} from 'src/app/domain/constants/playground.constants';

const PATH_SEPARATOR = '/';
const NETWORK_FAILURE_STATUS = 0;

export function playgroundErrorI18nKey(code: unknown): string | null {
  return typeof code === 'string' ? (PLAYGROUND_ERROR_I18N_KEYS.get(code) ?? null) : null;
}

export function playgroundHttpErrorI18nKey(status: unknown, code: unknown): string | null {
  if (typeof code !== 'string' || PLAYGROUND_ERROR_HTTP_STATUSES.get(code) !== status) {
    return null;
  }
  return playgroundErrorI18nKey(code);
}

export function isPlaygroundStatusUnknownError(error: unknown): boolean {
  const status = typeof error === 'object' && error !== null ? (error as { status?: unknown }).status : undefined;
  if (typeof status !== 'number') {
    return true;
  }
  return status === NETWORK_FAILURE_STATUS || status >= PLAYGROUND_SERVER_ERROR_MIN_STATUS;
}

export function isPlausiblePlaygroundDeviceToken(token: unknown): token is string {
  return (
    typeof token === 'string' &&
    token.length >= PLAYGROUND_DEVICE_TOKEN_MIN_LENGTH &&
    token.length <= PLAYGROUND_DEVICE_TOKEN_MAX_LENGTH &&
    PLAYGROUND_DEVICE_TOKEN_PATTERN.test(token)
  );
}

export function isPlaygroundLlmUrl(url: string, apiBase: string, pageOrigin: string): boolean {
  try {
    const target = new URL(url, pageOrigin);
    const base = new URL(apiBase, pageOrigin);
    if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) {
      return false;
    }
    const rest = target.pathname.slice(base.pathname.length);
    if (!rest.startsWith(ASSISTANT_API_SEGMENT)) {
      return false;
    }
    const tail = rest.slice(ASSISTANT_API_SEGMENT.length);
    return PLAYGROUND_LLM_PATH_SEGMENTS.some((segment) => tail === segment || tail.startsWith(segment + PATH_SEPARATOR));
  } catch {
    return false;
  }
}
