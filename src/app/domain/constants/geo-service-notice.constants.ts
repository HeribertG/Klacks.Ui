// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Translation keys of the inline geo service notice (operator switched a service off, configuration load
 * failed with retry). Shared by the notice component and the admin status card.
 */

export const GEO_SERVICE_NOTICE_KEYS = {
  mapDisabled: 'geoServices.notice.mapDisabled',
  geocodingDisabled: 'geoServices.notice.geocodingDisabled',
  loadFailed: 'geoServices.notice.loadFailed',
  retry: 'geoServices.notice.retry',
} as const;
