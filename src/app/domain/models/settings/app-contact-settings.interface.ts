// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAppContactSettings {
  name: string;
  addressName: string;
  supplementAddress: string;
  address: string;
  zip: string;
  place: string;
  state: string;
  country: string;
  timeZone: string;
  phone: string;
  email: string;
  accountingStart: number;
  mark: string;
  globalCalendarCountry: string;
  globalCalendarState: string;
  globalCalendarSelectionId: string;
}
