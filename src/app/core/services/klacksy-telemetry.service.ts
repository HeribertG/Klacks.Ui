// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
