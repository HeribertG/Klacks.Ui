// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IClientAvailability {
  id: string;
  clientId: string;
  date: string;
  hour: number;
  isAvailable: boolean;
}

export interface IClientAvailabilityBulkRequest {
  items: IClientAvailability[];
}
