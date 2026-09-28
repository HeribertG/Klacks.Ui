// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
  wunschCount: number;
  maxCount: number;
  totalCount: number;
  dienstCount: number;
  absenzCount: number;
}

export interface IResourceMonitorData {
  dailyData: IResourceMonitorDay[];
}

export interface IDashboardVisibilityStatus {
  isRestricted: boolean;
  hasVisibleGroups: boolean;
}
