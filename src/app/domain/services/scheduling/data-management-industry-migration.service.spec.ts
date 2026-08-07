// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataManagementIndustryMigrationService } from './data-management-industry-migration.service';
import { EVENT_BUS_TOKEN } from '../../interfaces/event-bus.interface';
import { SchedulingRuleApiService } from '../../../infrastructure/api/scheduling/scheduling-rule-api.service';
import { IIndustryMigrationCandidate } from '../../models/scheduling/industry-migration-candidate.model';

describe('DataManagementIndustryMigrationService', () => {
  const retiredRuleId = 'rule-retired';
  const activeRuleId = 'rule-active';
  const otherActiveRuleId = 'rule-active-2';
  const contractId = 'contract-1';

  let service: DataManagementIndustryMigrationService;
  let mockApiService: any;
  let eventBusSpy: any;

  const candidate: IIndustryMigrationCandidate = {
    contractId,
    contractName: 'Night shift contract',
    schedulingRuleId: retiredRuleId,
    schedulingRuleName: 'Security 24/7',
    industry: 'security',
    affectedClientCount: 4,
  };

  const configure = (candidates: IIndustryMigrationCandidate[]) => {
    eventBusSpy = { emit: vi.fn(), on: vi.fn(), onAny: vi.fn() };
    const apiSpy = {
      getIndustryMigrationList: vi.fn().mockResolvedValue(candidates),
      getSelectable: vi.fn().mockResolvedValue([
        { id: activeRuleId, name: 'Homecare standard' },
        { id: otherActiveRuleId, name: 'Homecare night' },
      ]),
      migrateContracts: vi.fn().mockResolvedValue(1),
    };
    const translateSpy = { instant: vi.fn().mockImplementation((key: string) => key) };

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        DataManagementIndustryMigrationService,
        { provide: EVENT_BUS_TOKEN, useValue: eventBusSpy },
        { provide: SchedulingRuleApiService, useValue: apiSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
    });

    service = TestBed.inject(DataManagementIndustryMigrationService);
    mockApiService = TestBed.inject(SchedulingRuleApiService) as any;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('reports the affected contracts so the industry switch is not silent', async () => {
    configure([candidate]);

    await service.load();

    expect(service.candidateCount()).toBe(1);
    expect(service.hasCandidates()).toBe(true);
    expect(service.candidates()[0].affectedClientCount).toBe(4);
    expect(service.status()).toBe('loaded');
  });

  it('assigns nothing on its own: a freshly loaded list has no pending assignment', async () => {
    configure([candidate]);

    await service.load();

    expect(service.targetRuleId(contractId)).toBe('');
    expect(service.pendingAssignments()).toEqual([]);
    expect(service.canApply()).toBe(false);
  });

  it('never calls the endpoint without an explicit choice, which the api rejects as a bad request', async () => {
    configure([candidate]);
    await service.load();

    const applied = await service.applyMigrations();

    expect(applied).toBe(false);
    expect(mockApiService.migrateContracts).not.toHaveBeenCalled();
  });

  it('submits only the contracts the admin actually picked a differing target for', async () => {
    const second: IIndustryMigrationCandidate = {
      ...candidate,
      contractId: 'contract-2',
      contractName: 'Day shift contract',
    };
    configure([candidate, second]);
    await service.load();

    service.setTarget(contractId, activeRuleId);

    expect(service.pendingAssignments()).toEqual([
      { contractId, schedulingRuleId: activeRuleId },
    ]);
    expect(service.canApply()).toBe(true);

    await service.applyMigrations();

    expect(mockApiService.migrateContracts).toHaveBeenCalledWith([
      { contractId, schedulingRuleId: activeRuleId },
    ]);
  });

  it('drops a target that equals the rule the contract already uses', async () => {
    configure([candidate]);
    await service.load();

    service.setTarget(contractId, retiredRuleId);

    expect(service.pendingAssignments()).toEqual([]);
    expect(service.canApply()).toBe(false);
  });

  it('reloads after a successful migration and reports how many contracts the server moved', async () => {
    configure([candidate]);
    await service.load();
    mockApiService.getIndustryMigrationList.mockResolvedValue([]);
    service.setTarget(contractId, activeRuleId);

    const applied = await service.applyMigrations();

    expect(applied).toBe(true);
    expect(mockApiService.getIndustryMigrationList).toHaveBeenCalledTimes(2);
    expect(service.hasCandidates()).toBe(false);
    expect(service.lastMigratedCount()).toBe(1);
  });

  it('reports a failed migration instead of pretending the contracts moved', async () => {
    configure([candidate]);
    await service.load();
    mockApiService.migrateContracts.mockRejectedValueOnce(new Error('boom'));
    service.setTarget(contractId, activeRuleId);

    const applied = await service.applyMigrations();

    expect(applied).toBe(false);
    expect(service.hasSaveError()).toBe(true);
    expect(service.lastMigratedCount()).toBeNull();
    expect(eventBusSpy.emit).toHaveBeenCalled();
    expect(mockApiService.getIndustryMigrationList).toHaveBeenCalledTimes(2);
  });

  it('preselects a suggested rule when the api offers one', async () => {
    configure([{ ...candidate, suggestedRuleId: activeRuleId, suggestedRuleName: 'Homecare standard' }]);

    await service.load();

    expect(service.targetRuleId(contractId)).toBe(activeRuleId);
    expect(service.pendingAssignments()).toEqual([
      { contractId, schedulingRuleId: activeRuleId },
    ]);
  });

  it('works unchanged while the api does not send a suggestion yet', async () => {
    configure([candidate]);

    await service.load();

    expect(service.targetRuleId(contractId)).toBe('');
    expect(service.status()).toBe('loaded');
  });

  it('ignores a suggestion that is not among the selectable rules, which would render as a blank picker', async () => {
    configure([{ ...candidate, suggestedRuleId: 'rule-not-selectable' }]);

    await service.load();

    expect(service.targetRuleId(contractId)).toBe('');
    expect(service.pendingAssignments()).toEqual([]);
  });

  it('surfaces a failed load rather than showing an empty list as "nothing affected"', async () => {
    configure([candidate]);
    mockApiService.getIndustryMigrationList.mockRejectedValueOnce(new Error('network down'));

    await service.load();

    expect(service.status()).toBe('error');
    expect(service.hasCandidates()).toBe(false);
    expect(eventBusSpy.emit).toHaveBeenCalled();
  });

  it('names the industry through the existing option labels and echoes unknown slugs', async () => {
    configure([candidate]);
    await service.load();

    expect(service.industryLabel('security')).toBe('setting.activeIndustries.security');
    expect(service.industryLabel('legacy-industry')).toBe('legacy-industry');
  });
});
