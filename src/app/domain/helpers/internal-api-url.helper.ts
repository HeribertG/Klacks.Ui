// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tells whether a request URL addresses the own Klacks API: it starts with the configured API base URL, or it is a
 * path below /api/ on the origin of the API or of the page (relative URLs resolve against the page). Every place that
 * sends the session cookies, renews the session or treats a failure as one of the own backend uses this one rule.
 * @param url - Absolute or relative URL of the request
 * @param apiBaseUrl - Configured base URL of the own API (absolute, or relative to the page)
 * @param pageOrigin - Origin of the page
 */

const API_PATH_PREFIX = '/api/';

export function isInternalApiUrl(
  url: string,
  apiBaseUrl: string,
  pageOrigin: string = window.location.origin,
): boolean {
  if (!url) {
    return false;
  }
  if (apiBaseUrl && url.startsWith(apiBaseUrl)) {
    return true;
  }
  try {
    const target = new URL(url, pageOrigin);
    if (!target.pathname.startsWith(API_PATH_PREFIX)) {
      return false;
    }
    const apiOrigin = new URL(apiBaseUrl, pageOrigin).origin;
    return target.origin === apiOrigin || target.origin === pageOrigin;
  } catch {
    return false;
  }
}
