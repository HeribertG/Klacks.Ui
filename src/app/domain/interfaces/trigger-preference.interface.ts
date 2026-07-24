// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface ITriggerPreference {
  triggerKind: string;
  muted: boolean;
  snoozedUntilUtc?: string | null;
  minimumSeverity?: string | null;
}
