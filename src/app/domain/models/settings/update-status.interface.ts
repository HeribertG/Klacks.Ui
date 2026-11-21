// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { EngineUpgradeBlockedReason } from './engine-upgrade-blocked-reason.enum';
import { IUpdateAvailability } from './update-availability.interface';
import { IUpdateHistoryItem } from './update-history-item.interface';

export interface IUpdateStatus {
  currentVersion: string;
  availability: IUpdateAvailability | null;
  activeOperation: IUpdateHistoryItem | null;
  lastOperation: IUpdateHistoryItem | null;
  currentMajor: number;
  availableMajor: number | null;
  canStartEngineUpgrade: boolean;
  engineUpgradeBlockedReason: EngineUpgradeBlockedReason | null;
}
