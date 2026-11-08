// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Wire body of POST Clients/StandIns (Klacks.Api CreateStandInsResource); the dates are calendar days (yyyy-MM-dd).
 */
export interface ICreateStandInsRequest {
  count: number;
  namePattern: string;
  groupId: string;
  validFrom: string;
  validUntil: string | null;
  qualificationIds: string[];
}
