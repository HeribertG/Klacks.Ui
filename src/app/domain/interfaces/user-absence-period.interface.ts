// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IUserAbsencePeriod {
  id: string;
  appUserId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}
