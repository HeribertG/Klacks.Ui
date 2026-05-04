// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Transfer object matching the backend ClientSortOrderDto.
 * @param clientId - The client's unique ID
 * @param sortOrder - 0-based position in the user's sort order for the group
 */

export interface ClientSortOrderDto {
  clientId: string;
  sortOrder: number;
}
