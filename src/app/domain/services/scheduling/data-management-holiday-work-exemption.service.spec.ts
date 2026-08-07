// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataManagementHolidayWorkExemptionService } from './data-management-holiday-work-exemption.service';
import { EVENT_BUS_TOKEN } from '../../interfaces/event-bus.interface';
import { SchedulingRuleApiService } from '../../../infrastructure/api/scheduling/scheduling-rule-api.service';
import { IHolidayWorkExemption } from '../../models/scheduling/holiday-work-exemption.model';

describe('DataManagementHolidayWorkExemptionService', () => {
  const activeRuleId = 'rule-active';
  const retiredRuleId = 'rule-retired';

  let service: DataManagementHolidayWorkExemptionService;
  let mockApiService: any;
  let eventBusSpy: any;

  const globalExemption: IHolidayWorkExemption = {
    id: 'exemption-global',
    description: 'Care operation',
    schedulingRuleId: null,
    importSourceKey: '',
  };

  beforeEach(() => {
    eventBusSpy = { emit: vi.fn(), on: vi.fn(), onAny: vi.fn() };
    const apiSpy = {
      getAll: vi.fn().mockResolvedValue([
        { id: activeRuleId, name: 'Care 24/7' },
        { id: retiredRuleId, name: 'Retired industry rule' },
      ]),
      getSelectable: vi.fn().mockResolvedValue([{ id: activeRuleId, name: 'Care 24/7' }]),
      getHolidayWorkExemptions: vi.fn().mockResolvedValue([globalExemption]),
      createHolidayWorkExemption: vi.fn().mockResolvedValue(globalExemption),
      deleteHolidayWorkExemption: vi.fn().mockResolvedValue(undefined),
    };
    const translateSpy = { instant: vi.fn().mockImplementation((key: string) => key) };

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        DataManagementHolidayWorkExemptionService,
        { provide: EVENT_BUS_TOKEN, useValue: eventBusSpy },
        { provide: SchedulingRuleApiService, useValue: apiSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
    });

    service = TestBed.inject(DataManagementHolidayWorkExemptionService);
    mockApiService = TestBed.inject(SchedulingRuleApiService) as any;
  });

  it('offers only selectable rules for a new exemption but names retired ones on existing rows', async () => {
    await service.init();

    expect(service.selectableRules.map(r => r.id)).toEqual([activeRuleId]);
    expect(service.scopeLabel(retiredRuleId)).toBe('Retired industry rule');
  });

  it('labels a null scope as global', async () => {
    await service.init();

    expect(service.scopeLabel(null)).toBe('setting.holidayWorkExemption.scope.global');
  });

  it('never renders a raw id for a rule that no longer exists', async () => {
    await service.init();

    expect(service.scopeLabel('deleted-rule-id')).toBe(
      'setting.holidayWorkExemption.scope.unknownRule'
    );
  });

  it('sends the draft and reloads the list after a successful create', async () => {
    const draft = service.createExemptionDraft();
    draft.description = 'Security service';
    draft.schedulingRuleId = activeRuleId;

    const saved = await service.saveExemption(draft);

    expect(saved).toBe(true);
    expect(mockApiService.createHolidayWorkExemption).toHaveBeenCalledWith(draft);
    expect(mockApiService.getHolidayWorkExemptions).toHaveBeenCalled();
  });

  it('reports a failed create instead of leaving a phantom row behind', async () => {
    mockApiService.createHolidayWorkExemption.mockRejectedValueOnce(new Error('boom'));

    const saved = await service.saveExemption(service.createExemptionDraft());

    expect(saved).toBe(false);
    expect(eventBusSpy.emit).toHaveBeenCalled();
    expect(mockApiService.getHolidayWorkExemptions).toHaveBeenCalled();
  });

  it('refuses to call the endpoint without an id', async () => {
    const deleted = await service.deleteExemption('');

    expect(deleted).toBe(false);
    expect(mockApiService.deleteHolidayWorkExemption).not.toHaveBeenCalled();
  });

  it('reloads after a delete so the list matches the server', async () => {
    const deleted = await service.deleteExemption(globalExemption.id);

    expect(deleted).toBe(true);
    expect(mockApiService.deleteHolidayWorkExemption).toHaveBeenCalledWith(globalExemption.id);
    expect(mockApiService.getHolidayWorkExemptions).toHaveBeenCalled();
  });
});
