// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IWorkNotification {
  workId: string;
  clientId: string;
  shiftId: string;
  currentDate: Date;
  operationType: 'created' | 'updated' | 'deleted';
  sourceConnectionId: string;
  analyseToken?: string | null;
}
