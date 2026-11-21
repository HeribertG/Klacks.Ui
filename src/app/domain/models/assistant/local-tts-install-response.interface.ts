// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Answer of the local voice install request as the settings card needs it.
 * @param httpStatus - HTTP status of the answer (202 queued, 400 invalid consent, 409 already pending), 0 on a network error
 * @param reason - English reason sent by the server, empty when the answer had no readable body
 */
export interface LocalTtsInstallResponse {
  httpStatus: number;
  reason: string;
}
