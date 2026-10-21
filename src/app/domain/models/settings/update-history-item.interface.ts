// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IUpdateHistoryItem {
  id: string;
  operationType: string;
  status: string;
  channel: string;
  fromVersion: string;
  targetVersion: string;
  containsMigrations: boolean;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  message?: string;
}
