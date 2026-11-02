// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pins that variant mode is separate from scenario mode with the real services on both sides. The cut buttons of the
 * cut-shift list and the all-shift navigation only look at AnalyseScenarioService.isScenarioMode(); as long as
 * entering a variant leaves that false, they stay usable in variant mode, and the savebar term that frees shift saving
 * in variant mode can never meet an open scenario.
 */

import { TestBed } from '@angular/core/testing';
import { PERMISSION_CHECKER } from 'src/app/domain/interfaces/permission-checker.interface';
import { of, Subject } from 'rxjs';
import { AnalyseScenarioService } from './analyse-scenario.service';
import { ScenarioVariantService } from './scenario-variant.service';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-status.enum';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { DataAnalyseScenarioService } from 'src/app/infrastructure/api/schedule/data-analyse-scenario.service';
import { DataScenarioVariantService } from 'src/app/infrastructure/api/schedule/data-scenario-variant.service';

const variant: IScenarioVariant = {
  id: 'variant-1',
  name: 'Winter key',
  groupId: 'group-1',
  fromDate: '2026-11-02',
  untilDate: '2026-11-29',
  token: 'variant-token-1',
  status: AnalyseScenarioStatus.Active,
  isExpired: false,
  shiftCount: 0,
};

const scenario: IAnalyseScenario = {
  id: 'scenario-1',
  name: 'Scenario',
  description: '',
  groupId: 'group-1',
  fromDate: '2026-11-02',
  untilDate: '2026-11-29',
  token: 'scenario-token-1',
  createdByUser: 'user-1',
  variantIds: [],
  status: AnalyseScenarioStatus.Active,
};

describe('variant mode and scenario mode are separate', () => {
  let scenarios: AnalyseScenarioService;
  let variants: ScenarioVariantService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DataAnalyseScenarioService, useValue: { getByGroup: () => of([]) } },
        { provide: DataScenarioVariantService, useValue: { getByGroup: () => of([]) } },
        { provide: PERMISSION_CHECKER, useValue: { hasPermission: () => false, isAdmin: false } },
        { provide: SCHEDULE_SIGNALR, useValue: { wizard4CandidatesChanged$: new Subject(), autofillRunEnded$: new Subject() } },
      ],
    });
    scenarios = TestBed.inject(AnalyseScenarioService);
    variants = TestBed.inject(ScenarioVariantService);
  });

  it('leaves scenario mode off when a variant is entered, so the cut buttons and the all-shift navigation stay free', () => {
    // Act
    variants.enter(variant);

    // Assert
    expect(variants.isVariantMode()).toBe(true);
    expect(scenarios.isScenarioMode()).toBe(false);
    expect(scenarios.activeScenario()).toBeNull();
    expect(scenarios.activeToken()).toBeNull();
  });

  it('never hands the variant token out as a scenario token', () => {
    // Act
    variants.enter(variant);

    // Assert
    expect(scenarios.activeToken()).not.toBe(variant.token);
  });

  it('ends variant mode when a scenario is selected', () => {
    // Arrange
    variants.enter(variant);

    // Act
    scenarios.selectScenario(scenario);

    // Assert
    expect(scenarios.isScenarioMode()).toBe(true);
    expect(variants.isVariantMode()).toBe(false);
  });

  it('keeps the scenario open when variant mode is left', () => {
    // Arrange
    scenarios.selectScenario(scenario);

    // Act
    variants.leave();

    // Assert
    expect(scenarios.isScenarioMode()).toBe(true);
  });
});
