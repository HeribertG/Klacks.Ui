// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ICollisionNotification {
  workId1: string;
  workId2: string;
  clientId: string;
  clientName: string;
  date: string;
  timeRange1: string;
  timeRange2: string;
  blockType1: string;
  blockType2: string;
}

export interface ICollisionListNotification {
  collisions: ICollisionNotification[];
  isFullRefresh: boolean;
  checkedClientId?: string;
  checkedDate?: string;
  analyseToken?: string | null;
}
