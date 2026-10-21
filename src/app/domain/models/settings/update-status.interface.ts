// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IUpdateAvailability } from './update-availability.interface';
import { IUpdateHistoryItem } from './update-history-item.interface';

export interface IUpdateStatus {
  currentVersion: string;
  availability: IUpdateAvailability | null;
  activeOperation: IUpdateHistoryItem | null;
  lastOperation: IUpdateHistoryItem | null;
}
