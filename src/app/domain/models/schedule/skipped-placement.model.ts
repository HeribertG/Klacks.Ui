// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * A single wizard placement that was skipped because it would have violated a
 * Block-mode compliance rule. Mirrors the backend SkippedPlacementDto.
 * @param clientId - Id of the agent the placement targeted
 * @param clientName - Resolved display name; filled in by the consuming component, not sent by the API
 * @param date - Date of the skipped placement (yyyy-MM-dd)
 * @param shiftId - Shift the placement targeted, if known
 * @param shiftName - Resolved display name; filled in by the consuming component, not sent by the API
 * @param reasonKey - schedule.error-list.* translation key of the violated rule (no interpolation params)
 */

export interface SkippedPlacementEntry {
  clientId: string;
  clientName?: string;
  date: string;
  shiftId: string | null;
  shiftName?: string;
  reasonKey: string;
}
