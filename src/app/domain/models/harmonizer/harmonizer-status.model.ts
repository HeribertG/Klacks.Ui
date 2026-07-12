// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HarmonizerResult } from './harmonizer-progress.model';

/**
 * Response of the backend harmonizer job status endpoint. Used by the reconnect
 * fallback to recover job outcomes whose SignalR events were missed.
 * @param status - Server-side job state (running/completed/cancelled/failed/unknown)
 * @param result - Final result when the job completed, otherwise null
 * @param reason - Failure reason when the job failed, otherwise null
 */
export interface HarmonizerJobStatusResponse {
  status: 'running' | 'completed' | 'cancelled' | 'failed' | 'unknown';
  result: HarmonizerResult | null;
  reason: string | null;
}
