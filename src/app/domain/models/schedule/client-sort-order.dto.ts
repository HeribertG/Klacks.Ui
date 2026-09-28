// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Transfer object matching the backend ClientSortOrderDto.
 * @param clientId - The client's unique ID
 * @param sortOrder - 0-based position in the user's sort order for the group
 */

export interface ClientSortOrderDto {
  clientId: string;
  sortOrder: number;
}
