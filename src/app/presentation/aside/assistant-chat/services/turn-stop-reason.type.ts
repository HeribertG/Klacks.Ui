// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export type TurnStopReason =
  | 'user-button'
  | 'voice-bubble'
  | 'barge-in'
  | 'session-end'
  | 'superseded'
  | 'panel-closed';
