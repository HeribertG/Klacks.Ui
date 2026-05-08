// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IClientLocationResource {
  id: string;
  type: number;
  currentAddress: IAddressInfo | null;
}

export interface IAddressInfo {
  city: string;
  country: string;
  zip: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface IShiftCoverageStatistics {
  groupId: string;
  groupName: string;
  totalSlots: number;
  coveredSlots: number;
  totalWorkEntries: number;
  sealedWorkEntries: number;
}

export interface IResourceMonitorDay {
  date: string;
  shouldHours: number;
  actualHours: number;
}

export interface IResourceMonitorData {
  dailyData: IResourceMonitorDay[];
}
