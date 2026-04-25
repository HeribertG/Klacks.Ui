// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Connection lifecycle states for the SignalR helper.
 *
 * Idle         — service constructed, no start requested yet, or after dispose.
 * Connecting   — startConnection in progress, no successful start yet.
 * Connected    — hub.start() succeeded, GetConnectionId returned, group rejoin done.
 * Reconnecting — built-in withAutomaticReconnect or scheduleFullReconnect cycling.
 * Failed       — give-up state; only watchdog or external trigger leaves this state.
 * AuthFailed   — terminal state after a 401 that survived a token refresh; no
 *                further reconnect attempts until the user re-authenticates.
 */
export type SignalRConnectionState =
  | 'Idle'
  | 'Connecting'
  | 'Connected'
  | 'Reconnecting'
  | 'Failed'
  | 'AuthFailed';

/**
 * Returns delay with +/- factor random jitter applied.
 * Prevents thundering-herd reconnect spikes when many clients race to
 * reconnect after a backend restart.
 */
export function jitter(delayMs: number, factor = 0.3): number {
  if (delayMs <= 0) return 0;
  const spread = delayMs * factor;
  const offset = (Math.random() * 2 - 1) * spread;
  return Math.max(0, Math.round(delayMs + offset));
}

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
