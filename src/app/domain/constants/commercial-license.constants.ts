// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Location of the commercial license page on the Klacks website. The website serves German without a
 * language prefix and redirects the country-less path to the language's default country.
 */
export const COMMERCIAL_LICENSE_SITE_URL = 'https://klacks-software.ch';
export const COMMERCIAL_LICENSE_PAGE_SLUG = 'lizenz';
export const COMMERCIAL_LICENSE_UNPREFIXED_LANGUAGE = 'de';
export const COMMERCIAL_LICENSE_SITE_LANGUAGES: readonly string[] = [
  'de', 'en', 'fr', 'it', 'ar', 'cs', 'da', 'el', 'es', 'fi', 'he', 'id', 'ja',
  'ko', 'ms', 'nb', 'nl', 'pl', 'pt', 'ro', 'sv', 'th', 'vi', 'zh-cn', 'zh-tw',
];
