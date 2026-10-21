// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface AbsenceFormModel {
  name: string;
  abbreviation: string;
  description: string;
  defaultLength: number;
  defaultValue: number;
  withSaturday: boolean;
  withSunday: boolean;
  withHoliday: boolean;
  appliesToContainer: boolean;
  color: string;
  hideInGantt: boolean;
  macroId: string;
  isUnpaid: boolean;
  isOnCall: boolean;
}
