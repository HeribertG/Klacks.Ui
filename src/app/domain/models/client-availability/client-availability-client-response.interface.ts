// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Response of the client availability client list from the backend.
 * @param clients - List of filtered clients
 * @param totalCount - Total count (before paging)
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
