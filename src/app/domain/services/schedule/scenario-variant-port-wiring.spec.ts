// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The scenario service and the variant service inject each other's world directly: this builds both over the real port
 * bindings of the app, so a dependency cycle or a missing binding fails here and not at the first page load.
 */

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { APP_PORT_BINDINGS } from 'src/app/app.port-bindings';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { AnalyseScenarioService } from './analyse-scenario.service';
import { ScenarioVariantService } from './scenario-variant.service';

describe('scenario and variant service wiring', () => {
  it('builds both services over the port bindings of the app', () => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [
        ...APP_PORT_BINDINGS,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SCHEDULE_SIGNALR, useValue: { wizard4CandidatesChanged$: new Subject(), autofillRunEnded$: new Subject() } },
      ],
    });

    // Act
    const scenarios = TestBed.inject(AnalyseScenarioService);
    const variants = TestBed.inject(ScenarioVariantService);

    // Assert
    expect(scenarios.isScenarioMode()).toBe(false);
    expect(variants.canManage()).toBe(false);
  });
});
