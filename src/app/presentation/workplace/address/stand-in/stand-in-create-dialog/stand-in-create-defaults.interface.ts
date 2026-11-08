// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Group and membership period the "Create placeholders" dialog starts with.
 * @param groupId - Group the placeholders are created in (the group selected in the schedule)
 * @param groupName - Name of that group, shown read-only in the dialog title
 * @param validFrom - First membership day; today when not given
 * @param validUntil - Last membership day; open-ended when not given
 */
export interface StandInCreateDefaults {
  groupId: string;
  groupName: string;
  validFrom?: Date | null;
  validUntil?: Date | null;
}
