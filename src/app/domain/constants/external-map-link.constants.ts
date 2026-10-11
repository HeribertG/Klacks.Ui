// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The only place in Klacks.Ui allowed to name external map websites: links a user opens deliberately in
 * a new tab (OpenStreetMap, Google Street View). They are hidden whenever the installation forbids
 * outbound geo traffic. Placeholders {lat} and {lon} are replaced by buildExternalMapLink.
 */

export const EXTERNAL_MAP_LINK_LATITUDE_PLACEHOLDER = '{lat}';

export const EXTERNAL_MAP_LINK_LONGITUDE_PLACEHOLDER = '{lon}';

export const OPEN_STREET_MAP_LINK_TEMPLATE =
  'https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=17/{lat}/{lon}';

export const STREET_VIEW_LINK_TEMPLATE =
  'https://www.google.com/maps/@{lat},{lon},3a,75y,90t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192';
