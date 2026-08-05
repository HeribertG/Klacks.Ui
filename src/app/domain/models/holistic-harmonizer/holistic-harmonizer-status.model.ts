// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Wire type of the holistic harmonizer status endpoint. Deliberately separate from the
 * HolisticHarmonizerStatus signal type: the wire knows 'unknown' (the server no longer tracks the
 * job), which the service maps onto 'failed'.
 */

import { HolisticHarmonizerRunResponse } from './holistic-harmonizer-run.model';

export interface HolisticHarmonizerJobStatusResponse {
  status: 'running' | 'completed' | 'cancelled' | 'failed' | 'unknown';
  result: HolisticHarmonizerRunResponse | null;
  reason: string | null;
}
