// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AutoWizardSoftAlternativeService } from './auto-wizard-soft-alternative.service';
import { AutoWizardJobTrackerService } from './auto-wizard-job-tracker.service';
import { AutoWizardPendingScenario } from './auto-wizard-pending-scenario.interface';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { AutoWizardSoftAlternative } from 'src/app/domain/models/schedule/auto-wizard-soft-alternative.interface';
import { KeywordMode } from 'src/app/domain/models/schedule/keyword-mode.enum';
import { ScenarioSummary } from 'src/app/domain/models/schedule/scenario-summary.model';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AutoWizardSoftAlternativeOffer } from './auto-wizard-soft-alternative-offer.interface';
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
  const shownGroupId = signal<string | null | undefined>(undefined);
  const shownPeriodFrom = signal('2026-11-01');

  beforeEach(() => {
    shownGroupId.set(undefined);
    shownPeriodFrom.set('2026-11-01');
    showInfo = vi.fn();
    showScenario = vi.fn().mockResolvedValue(undefined);
    instant = vi.fn((key: string) => key);
    const isShowing = (groupId: string | null, periodFrom: string, periodUntil: string): boolean =>
      shownGroupId() === groupId && shownPeriodFrom() === periodFrom && periodUntil === PENDING.periodUntil;
    TestBed.configureTestingModule({
      providers: [
        { provide: ToastShowService, useValue: { showInfo } },
        { provide: TranslateService, useValue: { instant } },
        { provide: AutoWizardJobTrackerService, useValue: { showScenario, isShowing } },
        { provide: DataManagementScheduleService, useValue: { isRead: signal({ count: 0, resetScroll: false }) } },
      ],
    });
    service = TestBed.inject(AutoWizardSoftAlternativeService);
  });

  afterEach(() => TestBed.resetTestingModule());

  function present(
    outcome: AutoWizardSoftKeywordRetryOutcome | undefined,
    showingGroup = true,
    scenario: AutoWizardPendingScenario = PENDING,
  ): void {
    service.present({
      outcome,
      alternative: outcome === AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept ? ALTERNATIVE : null,
      strictScenarioName: 'Auto Plan',
      strictSummary: null,
      alternativeScenario: outcome === AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept ? scenario : null,
      showingGroup,
      groupId: scenario.groupId,
      groupName: 'Team A',
    });
  }

  function shownOffer(): AutoWizardSoftAlternativeOffer {
    const offer = service.offer();
    if (!offer) {
      throw new Error('No offer is shown');
    }
    return offer;
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

  it('names a kept alternative of another group in a toast and keeps it waiting', () => {
    // Arrange / Act
    present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept, false);
    TestBed.tick();

    // Assert
    expect(service.offer()).toBeNull();
    expect(service.pendingOffers()).toHaveLength(1);
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

  it('treats a promoted soft run as the plain result: neutral hint, no alternative', () => {
    // Arrange / Act
    present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Promoted);
    TestBed.tick();

    // Assert
    expect(showInfo).toHaveBeenCalledTimes(1);
    expect(showInfo).toHaveBeenCalledWith('autoWizard.softAlternative.promoted', expect.any(String), '', expect.anything());
    expect(service.offer()).toBeNull();
    expect(service.pendingOffers()).toHaveLength(0);
    expect(showScenario).not.toHaveBeenCalled();
  });

  it('drops a waiting offer of an earlier run for the group when the next run is promoted', () => {
    // Arrange
    present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept, false);

    // Act
    present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Promoted, false);

    // Assert
    expect(service.pendingOffers()).toHaveLength(0);
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
    await service.openAlternative(shownOffer());

    // Assert
    expect(showScenario).toHaveBeenCalledWith(PENDING);
    expect(service.offer()).toBeNull();
  });

  it('drops the offer when the planner keeps the strict plan', () => {
    // Arrange
    present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept);

    // Act
    service.dismiss(shownOffer());

    // Assert
    expect(service.offer()).toBeNull();
    expect(showScenario).not.toHaveBeenCalled();
  });

  it('keeps a newer offer when an older one is dismissed', () => {
    // Arrange
    present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept);
    const older = shownOffer();
    present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept);
    const newer = shownOffer();

    // Act
    service.dismiss(older);

    // Assert
    expect(newer).not.toBe(older);
    expect(service.offer()).toBe(newer);
  });

  describe('offers for another group', () => {
    it('shows the waiting offer once the planner opens its group and period', () => {
      // Arrange
      present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept, false);
      TestBed.tick();

      // Act
      shownGroupId.set('g1');
      TestBed.tick();

      // Assert
      expect(service.offer()?.alternativeScenario).toEqual(PENDING);
      expect(service.pendingOffers()).toHaveLength(0);
    });

    it('keeps the offer waiting while its group is shown for another period', () => {
      // Arrange
      present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept, false);
      shownPeriodFrom.set('2026-12-01');

      // Act
      shownGroupId.set('g1');
      TestBed.tick();

      // Assert
      expect(service.offer()).toBeNull();
      expect(service.pendingOffers()).toHaveLength(1);
    });

    it('does not show the offer again after it was dismissed', () => {
      // Arrange
      present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept, false);
      shownGroupId.set('g1');
      TestBed.tick();

      // Act
      service.dismiss(shownOffer());
      shownGroupId.set('g2');
      TestBed.tick();
      shownGroupId.set('g1');
      TestBed.tick();

      // Assert
      expect(service.offer()).toBeNull();
      expect(service.pendingOffers()).toHaveLength(0);
    });

    it('keeps only the newest waiting offer per group', () => {
      // Arrange
      present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept, false);
      present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept, false, { ...PENDING, groupId: 'g2', scenarioId: 'soft-2' });

      // Act
      present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept, false, { ...PENDING, scenarioId: 'soft-3' });

      // Assert
      expect(service.pendingOffers().map((o) => o.alternativeScenario.scenarioId)).toEqual(['soft-2', 'soft-3']);
    });

    it('drops the waiting offer of a group whose newer run kept no alternative', () => {
      // Arrange
      present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept, false);

      // Act
      present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.NotBetter, false);

      // Assert
      expect(service.pendingOffers()).toHaveLength(0);
    });

    it('forgets shown and waiting offers on reset', () => {
      // Arrange
      present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept);
      present(AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept, false, { ...PENDING, groupId: 'g2' });

      // Act
      service.reset();

      // Assert
      expect(service.offer()).toBeNull();
      expect(service.pendingOffers()).toHaveLength(0);
    });
  });
});
