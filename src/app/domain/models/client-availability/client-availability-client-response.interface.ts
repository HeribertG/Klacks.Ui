// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Response der Client-Availability Client-Liste vom Backend.
 * @param clients - Liste der gefilterten Clients
 * @param totalCount - Gesamtanzahl (vor Paging)
 */
export interface IClientAvailabilityClientResponse {
  clients: IClientAvailabilityClientResource[];
  totalCount: number;
}

export interface IClientAvailabilityClientResource {
  id: string;
  name: string;
  firstName: string;
  company: string;
  legalEntity: boolean;
  idNumber: number;
  groupIds: string[];
}
