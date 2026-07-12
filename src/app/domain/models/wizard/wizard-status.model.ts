// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { WizardResult } from './wizard-progress.model';

/**
 * Response of the backend wizard job status endpoint. Used by the reconnect
 * fallback to recover job outcomes whose SignalR events were missed.
 * @param status - Server-side job state (running/completed/cancelled/failed/unknown)
 * @param result - Final result when the job completed, otherwise null
 * @param reason - Failure reason when the job failed, otherwise null
 */
export interface WizardJobStatusResponse {
  status: 'running' | 'completed' | 'cancelled' | 'failed' | 'unknown';
  result: WizardResult | null;
  reason: string | null;
}
