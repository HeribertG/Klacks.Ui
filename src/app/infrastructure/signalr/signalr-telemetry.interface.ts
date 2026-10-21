// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { SignalRConnectionState } from './signalr-connection-state';

/**
 * Telemetry snapshot exported by the connection helper. All fields are
 * read-only summaries, intended for diagnostics dashboards or logs.
 */
export interface SignalRTelemetry {
  state: SignalRConnectionState;
  reconnectCount: number;
  authErrorCount: number;
  lastDisconnectAt: number | null;
  lastReconnectAt: number | null;
  lastSuccessfulPushAt: number | null;
  avgDisconnectDurationMs: number;
  lastErrorMessage: string | null;
}
