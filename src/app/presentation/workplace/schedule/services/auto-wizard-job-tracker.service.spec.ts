// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AutoWizardJobTrackerService } from './auto-wizard-job-tracker.service';
import { AutoWizardJobContext } from './auto-wizard-job-context.interface';
import { AutoWizardPendingScenario } from './auto-wizard-pending-scenario.interface';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { ENTITY_STATE_PROVIDER_TOKEN } from 'src/app/domain/interfaces/entity-state-provider.interface';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

const JOB: AutoWizardJobContext = {
  jobId: null,
  groupId: null,
  groupName: 'autoWizard.group.none',
  periodFrom: '2026-06-01',
  periodUntil: '2026-06-07',
};

const PENDING_G1: AutoWizardPendingScenario = {
  groupId: 'g1',
  periodFrom: '2026-06-01',
  periodUntil: '2026-06-07',
  scenarioId: 's-9',
  token: 't-9',
  name: 'Auto Plan',
};

describe('AutoWizardJobTrackerService', () => {
  const selectedGroupId = signal<string | undefined>(undefined);
  const visibleEntity = signal<string>(EntityName.SCHEDULE);
  const isRead = signal({ count: 0, resetScroll: false });
  let schedule: { periodStartDate: Date | null; periodEndDate: Date | null; isRead: typeof isRead; readDatas: ReturnType<typeof vi.fn> };
  let tracker: AutoWizardJobTrackerService;
  let selectScenario: ReturnType<typeof vi.fn>;

  function storedPending(): unknown {
    return JSON.parse(sessionStorage.getItem(StorageKeys.AUTO_WIZARD_PENDING_SCENARIO) ?? 'null');
  }

  function showPeriod(from: Date, until: Date): void {
    schedule.periodStartDate = from;
    schedule.periodEndDate = until;
    isRead.update((v) => ({ ...v, count: v.count + 1 }));
    TestBed.tick();
  }

  function reload(): AutoWizardJobTrackerService {
    return TestBed.runInInjectionContext(() => new AutoWizardJobTrackerService());
  }

  beforeEach(() => {
    sessionStorage.clear();
    selectedGroupId.set(undefined);
    visibleEntity.set(EntityName.SCHEDULE);
    selectScenario = vi.fn();
    schedule = {
      periodStartDate: new Date(2026, 5, 1),
      periodEndDate: new Date(2026, 5, 7),
      isRead,
      readDatas: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GroupSelectionService,
          useValue: {
            get selectedGroupId() {
              return selectedGroupId();
            },
            get selectedGroup() {
              return undefined;
            },
          },
        },
        { provide: ENTITY_STATE_PROVIDER_TOKEN, useValue: { nameOfVisibleEntity: visibleEntity } },
        { provide: AnalyseScenarioService, useValue: { scenarios: signal([]), selectScenario } },
        { provide: DataManagementScheduleService, useValue: schedule },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
      ],
    });
    tracker = TestBed.inject(AutoWizardJobTrackerService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('matches a run without group filter to the schedule without a selected group', () => {
    // Arrange
    tracker.begin(JOB);

    // Act
    const running = tracker.isRunningForCurrentGroup();
    selectedGroupId.set('g1');

    // Assert
    expect(running).toBe(true);
    expect(tracker.currentGroupName()).toBe('autoWizard.group.none');
    expect(tracker.runningElsewhereGroupName()).toBe('autoWizard.group.none');
  });

  it('keeps tracking in memory when the session storage refuses writes', () => {
    // Arrange
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    tracker.begin(JOB);

    // Act
    tracker.attachJobId('job-1');

    // Assert
    expect(tracker.activeJob()?.jobId).toBe('job-1');
  });

  it('restores nothing when the session storage cannot be read', () => {
    // Arrange
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    // Act
    const restored = tracker.restore();

    // Assert
    expect(restored).toBeNull();
    expect(tracker.activeJob()).toBeNull();
  });

  it('restores a stored job', () => {
    // Arrange
    sessionStorage.setItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB, JSON.stringify({ ...JOB, jobId: 'job-3' }));

    // Act
    const restored = tracker.restore();

    // Assert
    expect(restored?.jobId).toBe('job-3');
    expect(tracker.isRunningForCurrentGroup()).toBe(true);
  });

  it('opens a pending scenario only once', () => {
    // Arrange
    visibleEntity.set(EntityName.CLIENT);
    tracker.setPending({ ...PENDING_G1, groupId: null });
    TestBed.tick();

    // Act
    visibleEntity.set(EntityName.SCHEDULE);
    TestBed.tick();
    visibleEntity.set(EntityName.CLIENT);
    TestBed.tick();
    visibleEntity.set(EntityName.SCHEDULE);
    TestBed.tick();

    // Assert
    expect(selectScenario).toHaveBeenCalledTimes(1);
    expect(tracker.pendingScenarios()).toEqual([]);
  });

  it('keeps one pending scenario per group, the newest one winning', () => {
    // Arrange
    visibleEntity.set(EntityName.CLIENT);
    const olderG1 = { ...PENDING_G1, scenarioId: 's-old', token: 't-old' };
    const g2 = { ...PENDING_G1, groupId: 'g2', scenarioId: 's-2', token: 't-2' };

    // Act
    tracker.setPending(olderG1);
    tracker.setPending(g2);
    tracker.setPending(PENDING_G1);

    // Assert
    expect(tracker.pendingScenarios()).toEqual([g2, PENDING_G1]);
    expect(storedPending()).toEqual([g2, PENDING_G1]);
  });

  it('opens the pending scenario of each group when that group is shown', () => {
    // Arrange
    visibleEntity.set(EntityName.CLIENT);
    tracker.setPending(PENDING_G1);
    tracker.setPending({ ...PENDING_G1, groupId: 'g2', scenarioId: 's-2', token: 't-2' });
    visibleEntity.set(EntityName.SCHEDULE);

    // Act
    selectedGroupId.set('g1');
    TestBed.tick();
    selectedGroupId.set('g2');
    TestBed.tick();

    // Assert
    expect(selectScenario.mock.calls.map(([s]) => s.id)).toEqual(['s-9', 's-2']);
    expect(storedPending()).toBeNull();
  });

  it('keeps a pending scenario while its group is shown for another period', () => {
    // Arrange
    selectedGroupId.set('g1');
    schedule.periodStartDate = new Date(2026, 6, 1);
    schedule.periodEndDate = new Date(2026, 6, 7);
    tracker.setPending(PENDING_G1);
    TestBed.tick();
    const selectedOnOtherPeriod = selectScenario.mock.calls.length;

    // Act
    showPeriod(new Date(2026, 5, 1), new Date(2026, 5, 7));

    // Assert
    expect(selectedOnOtherPeriod).toBe(0);
    expect(selectScenario).toHaveBeenCalledTimes(1);
    expect(tracker.pendingScenarios()).toEqual([]);
  });

  it('forgets the running job and every pending scenario on reset', () => {
    // Arrange
    tracker.begin(JOB);
    tracker.attachJobId('job-1');
    visibleEntity.set(EntityName.CLIENT);
    tracker.setPending(PENDING_G1);

    // Act
    tracker.reset();

    // Assert
    expect(tracker.activeJob()).toBeNull();
    expect(tracker.pendingScenarios()).toEqual([]);
    expect(sessionStorage.getItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB)).toBeNull();
    expect(sessionStorage.getItem(StorageKeys.AUTO_WIZARD_PENDING_SCENARIO)).toBeNull();
  });

  describe('pending scenarios across a page reload', () => {
    it('opens a pending scenario stored before the reload once its group is shown and forgets it', () => {
      // Arrange
      sessionStorage.setItem(StorageKeys.AUTO_WIZARD_PENDING_SCENARIO, JSON.stringify([PENDING_G1]));
      selectedGroupId.set('g2');

      // Act
      const reloaded = reload();
      TestBed.tick();
      const selectedOnOtherGroup = selectScenario.mock.calls.length;
      selectedGroupId.set('g1');
      TestBed.tick();
      selectedGroupId.set('g2');
      TestBed.tick();
      selectedGroupId.set('g1');
      TestBed.tick();

      // Assert
      expect(selectedOnOtherGroup).toBe(0);
      expect(selectScenario).toHaveBeenCalledTimes(1);
      expect(selectScenario).toHaveBeenCalledWith(expect.objectContaining({ id: 's-9', token: 't-9' }));
      expect(reloaded.pendingScenarios()).toEqual([]);
      expect(sessionStorage.getItem(StorageKeys.AUTO_WIZARD_PENDING_SCENARIO)).toBeNull();
    });

    it('drops a corrupt stored pending collection', () => {
      // Arrange
      sessionStorage.setItem(StorageKeys.AUTO_WIZARD_PENDING_SCENARIO, '[{"scenarioId":1}]');

      // Act
      const reloaded = reload();
      TestBed.tick();

      // Assert
      expect(reloaded.pendingScenarios()).toEqual([]);
      expect(selectScenario).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(StorageKeys.AUTO_WIZARD_PENDING_SCENARIO)).toBeNull();
    });
  });
});
