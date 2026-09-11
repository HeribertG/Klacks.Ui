// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Presentation constants for the language-plugins settings card.
 * @param INDEX_SYNC_POLL_INTERVAL_MS - Interval at which the knowledge index sync status is polled while
 * Klacksy's search index is being rebuilt after a language pack was installed or uninstalled
 */
export const LANGUAGE_PLUGINS = {
  INDEX_SYNC_POLL_INTERVAL_MS: 10000,
} as const;
