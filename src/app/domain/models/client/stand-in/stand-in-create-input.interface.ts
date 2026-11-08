// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * What the user enters to create several stand-ins at once.
 * @param count - Number of stand-ins, 1 to STAND_IN_MAX_BULK_COUNT
 * @param namePattern - Display name holding STAND_IN_INDEX_PLACEHOLDER exactly once, e.g. "Fair {n}"
 * @param groupId - Group every stand-in becomes a member of
 * @param validFrom - First day of the membership and the group membership
 * @param validUntil - Last day of both, or null for open-ended
 * @param qualificationIds - Qualifications every stand-in holds
 */
export interface IStandInCreateInput {
  count: number | null;
  namePattern: string;
  groupId: string;
  validFrom: Date | null;
  validUntil: Date | null;
  qualificationIds: string[];
}
