// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API Root URL Helper
 *
 * Derives the API root URL from the configured base URL.
 */
import { environment } from 'src/environments/environment';

/**
 * Returns the base URL with the trailing "backend/" segment removed.
 *
 * @returns API root URL
 */
export function getApiRootUrl(): string {
  return environment.baseUrl.replace('backend/', '');
}
