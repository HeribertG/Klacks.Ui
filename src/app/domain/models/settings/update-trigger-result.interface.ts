// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IUpdateTriggerResult {
  enqueued: boolean;
  operationId?: string;
  reason: string;
}
