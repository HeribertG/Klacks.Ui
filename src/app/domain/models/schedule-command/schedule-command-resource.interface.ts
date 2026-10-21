// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ScheduleCommandResource {
  id: string;
  clientId: string;
  currentDate: string;
  commandKeyword: string;
  analyseToken?: string;
}
