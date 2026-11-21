// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { EngineUpgradeBlockedReason } from './engine-upgrade-blocked-reason.enum';

export interface IEngineUpgradeTriggerResult {
  enqueued: boolean;
  operationId: string | null;
  blockedReason: EngineUpgradeBlockedReason | null;
}
