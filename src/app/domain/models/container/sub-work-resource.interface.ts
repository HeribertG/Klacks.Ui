// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface SubWorkResource {
  id: string;
  shiftId: string;
  clientId: string;
  currentDate: string;
  startTime: string;
  endTime: string;
  workTime: number;
  parentWorkId: string;
  information: string | null;
  transportMode: number | null;
  startBase: string | null;
  endBase: string | null;
  shift?: {
    id: string;
    name: string;
    abbreviation: string;
    startShift: string;
    endShift: string;
    workTime: number;
    clientId: string;
    isTimeRange: boolean;
    isSporadic: boolean;
    client?: {
      id: string;
      name: string | null;
      firstName: string | null;
      company: string | null;
      addresses?: {
        id: string;
        street: string | null;
        zip: string | null;
        city: string | null;
        latitude: number | null;
        longitude: number | null;
      }[];
    };
  };
}
