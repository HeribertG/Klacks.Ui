// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ILocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  shiftId: string;
  briefingTime: string;
  debriefingTime: string;
}
