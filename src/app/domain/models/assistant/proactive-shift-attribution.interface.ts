// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IProactiveShiftAttribution {
  entityId: string;
  handledAtUtc: string | null;
  triggerKind: string;
}
