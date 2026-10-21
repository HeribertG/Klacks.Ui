// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface UndoOfferedEvent {
  messageKey: string;
  detail: string;
  labelKey: string;
  delayMs: number;
  onUndo: () => void;
}
