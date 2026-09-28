// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Klacksy telemetry (thin wrapper around existing analytics or console).
 */
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class KlacksyTelemetryService {
  trackTargetMiss(route: string, target: string): void {
    console.warn(`[klacksy] target miss: route=${route} target=${target}`);
  }
}
