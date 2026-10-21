// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface DeleteWorkScheduleEntryParams {
  id: string;
  sourceId: string;
  clientId: string;
  date: Date;
  entryId: string;
  entryType: number;
}
