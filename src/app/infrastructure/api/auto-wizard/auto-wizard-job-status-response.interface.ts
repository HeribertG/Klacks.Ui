// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { AutoWizardResult } from './auto-wizard-result.interface';

export interface AutoWizardJobStatusResponse {
  status: 'running' | 'completed' | 'cancelled' | 'failed' | 'unknown';
  result: AutoWizardResult | null;
  reason: string | null;
}
