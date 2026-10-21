// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IUpdateTriggerPreferenceRequest {
  muted?: boolean;
  snoozedUntilUtc?: string | null;
  minimumSeverity?: string | null;
}
