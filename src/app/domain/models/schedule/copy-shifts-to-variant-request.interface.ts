// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Which shifts to copy into a variant: an explicit selection or every shift of a source group. When both are
 * absent the server decides (it refuses an empty request).
 * @param shiftIds - Ids of the real shifts to copy
 * @param sourceGroupId - Group whose shifts are all copied
 */
export interface ICopyShiftsToVariantRequest {
  shiftIds?: string[];
  sourceGroupId?: string;
}
