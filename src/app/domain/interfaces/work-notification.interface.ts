// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IWorkNotification {
  workId: string;
  clientId: string;
  shiftId: string;
  currentDate: Date;
  operationType: 'created' | 'updated' | 'deleted';
  sourceConnectionId: string;
  analyseToken?: string | null;
}
