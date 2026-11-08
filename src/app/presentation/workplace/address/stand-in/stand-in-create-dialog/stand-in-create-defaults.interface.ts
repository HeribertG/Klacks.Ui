// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Group and membership period the "Create placeholders" dialog starts with.
 * @param groupId - Preselected group; empty when the host has none selected
 * @param validFrom - First membership day; today when not given
 * @param validUntil - Last membership day; open-ended when not given
 */
export interface StandInCreateDefaults {
  groupId?: string;
  validFrom?: Date | null;
  validUntil?: Date | null;
}
