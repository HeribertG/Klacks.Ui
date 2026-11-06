// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AutoWizardSoftAlternativeService } from './auto-wizard-soft-alternative.service';
import { AutoWizardJobTrackerService } from './auto-wizard-job-tracker.service';
import { AutoWizardPendingScenario } from './auto-wizard-pending-scenario.interface';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { AutoWizardSoftAlternative } from 'src/app/domain/models/schedule/auto-wizard-soft-alternative.interface';
import { KeywordMode } from 'src/app/domain/models/schedule/keyword-mode.enum';
import { ScenarioSummary } from 'src/app/domain/models/schedule/scenario-summary.model';
import {
  AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME,
  AutoWizardSoftKeywordRetryOutcome,
} from 'src/app/domain/constants/keyword-wish.constants';

const SUMMARY: ScenarioSummary = {
  token: 'soft-token',
  fromDate: '2026-11-01',
  untilDate: '2026-11-30',
  agentCount: 3,
  workCount: 20,
  demandedSlots: 30,
  filledSlots: 28,
  openSlots: 2,
  shifts: [],
  openSlotReasons: [],
};

const ALTERNATIVE: AutoWizardSoftAlternative = {
  scenarioId: 'soft-1',
  scenarioToken: 'soft-token',
  scenarioName: 'Auto Plan (soft)',
  keywordMode: KeywordMode.Soft,
  additionalFilledSlots: 3,
  summary: SUMMARY,
  brokenWishes: [],
};

const PENDING: AutoWizardPendingScenario = {
  groupId: 'g1',
  periodFrom: '2026-11-01',
  periodUntil: '2026-11-30',
  scenarioId: 'soft-1',
  token: 'soft-token',
  name: 'Auto Plan (soft)',
};

describe('AutoWizardSoftAlternativeService', () => {
  let showInfo: ReturnType<typeof vi.fn>;
  let showScenario: ReturnType<typeof vi.fn>;
  let instant: ReturnType<typeof vi.fn>;
  let service: AutoWizardSoftAlternativeService;

  beforeEach(() => {
    showInfo = vi.fn();
    showScenario = vi.fn().mockResolvedValue(undefined);
    instant = vi.fn((key: string) => key);
    TestBed.configureTestingModule({
      providers: [
        { provide: ToastShowService, useValue: { showInfo } },
        { provide: TranslateService, useValue: { instant } },
        { provide: AutoWizardJobTrackerService, useValue: { showScenario } },
      ],
    });
    service = TestBed.inject(AutoWizardSoftAlternativeService);
  });

  afterEach(() => TestBed.resetTestingModule());

  function present(outcome: AutoWizardSoftKeywordRetryOutcome | undefined, showingGroup = true): void {
    service.present({
      outcome,
      alternative: outcome === AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept ? ALTERNATIVE : null,
      strictScenarioName: 'Auto Plan',
      strictSummary: null,
      alternativeScenario: outcome === AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept ? PENDING : null,
      showingGroup,
      groupName: 'Team A',
    });
  }

  it('offers a kept alternative for the shown group without a toast', () => {
    // Arrange / Act
    present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept);

    // Assert
    expect(service.offer()).toEqual(
      expect.objectContaining({ strictScenarioName: 'Auto Plan', alternative: ALTERNATIVE, alternativeScenario: PENDING }),
    );
    expect(showInfo).not.toHaveBeenCalled();
  });

  it('names a kept alternative of another group in a toast instead of a dialog', () => {
    // Arrange / Act
    present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept, false);

    // Assert
    expect(service.offer()).toBeNull();
    expect(instant).toHaveBeenCalledWith('autoWizard.softAlternative.keptForGroup', {
      group: 'Team A',
      scenario: 'Auto Plan (soft)',
      count: 3,
    });
    expect(showInfo).toHaveBeenCalledTimes(1);
  });

  it.each([
    [AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.NotBetter, 'autoWizard.softAlternative.notBetter'],
    [AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Failed, 'autoWizard.softAlternative.failed'],
  ])('shows a neutral hint for %s', (outcome, key) => {
    // Arrange / Act
    present(outcome);

    // Assert
    expect(showInfo).toHaveBeenCalledWith(key, expect.any(String), '', expect.anything());
    expect(service.offer()).toBeNull();
  });

  it.each([AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.NotRequested, AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.NotNeeded, undefined])(
    'stays silent for %s',
    (outcome) => {
      // Arrange / Act
      present(outcome);

      // Assert
      expect(showInfo).not.toHaveBeenCalled();
      expect(service.offer()).toBeNull();
    },
  );

  it('opens the alternative through the tracker and clears the offer', async () => {
    // Arrange
    present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept);

    // Act
    await service.openAlternative();

    // Assert
    expect(showScenario).toHaveBeenCalledWith(PENDING);
    expect(service.offer()).toBeNull();
  });

  it('drops the offer when the planner keeps the strict plan', () => {
    // Arrange
    present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept);

    // Act
    service.dismiss();

    // Assert
    expect(service.offer()).toBeNull();
    expect(showScenario).not.toHaveBeenCalled();
  });
});
