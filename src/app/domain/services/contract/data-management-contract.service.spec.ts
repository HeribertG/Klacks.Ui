// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementContractService } from './data-management-contract.service';
import { DataManagementSchedulingRuleService } from '../scheduling/data-management-scheduling-rule.service';
import { DataManagementCalendarSelectionService } from '../calendar/data-management-calendar-selection.service';
import { DataManagementIndividualPeriodService } from '../scheduling/data-management-individual-period.service';
import { DataManagementSettingsService } from '../settings/data-management-settings.service';
import { DataContractService } from 'src/app/infrastructure/api/contract/data-contract.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { ISchedulingRule } from '../../models/scheduling/scheduling-rule.model';
import { Contract, IContract } from '../../models/contract/contract-class';
import { signal } from '@angular/core';
import { of } from 'rxjs';

function rule(id: string, name: string): ISchedulingRule {
  return { id, name } as ISchedulingRule;
}

describe('DataManagementContractService - assigned scheduling rule', () => {
  let service: DataManagementContractService;
  let readRuleById: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    readRuleById = vi.fn();

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementSchedulingRuleService,
          useValue: { readRuleById, readSelectableRules: vi.fn().mockResolvedValue([]) },
        },
        { provide: EVENT_BUS_TOKEN, useValue: { emit: vi.fn(), on: vi.fn() } },
        { provide: DataContractService, useValue: {} },
        { provide: DataManagementSettingsService, useValue: {} },
        { provide: DataManagementCalendarSelectionService, useValue: {} },
        { provide: DataManagementIndividualPeriodService, useValue: {} },
      ],
    });

    service = TestBed.inject(DataManagementContractService);
    service.availableSchedulingRules = [rule('active-1', 'Active rule')];
  });

  it('pulls in an assigned rule the active-industries filter excluded', async () => {
    // Arrange
    readRuleById.mockResolvedValue(rule('inactive-1', 'Rule of a deactivated industry'));

    // Act
    const pulledIn = await service.ensureAssignedSchedulingRuleIsSelectable('inactive-1');

    // Assert
    expect(readRuleById).toHaveBeenCalledWith('inactive-1');
    expect(pulledIn?.id).toBe('inactive-1');
    expect(service.availableSchedulingRules.map((r) => r.id)).toContain('inactive-1');
  });

  it('does not reload a rule that is already selectable', async () => {
    // Act
    const pulledIn = await service.ensureAssignedSchedulingRuleIsSelectable('active-1');

    // Assert
    expect(readRuleById).not.toHaveBeenCalled();
    expect(pulledIn).toBeUndefined();
    expect(service.availableSchedulingRules.length).toBe(1);
  });

  it('does nothing for a contract without an assigned rule', async () => {
    // Act
    const pulledIn = await service.ensureAssignedSchedulingRuleIsSelectable(undefined);

    // Assert
    expect(readRuleById).not.toHaveBeenCalled();
    expect(pulledIn).toBeUndefined();
  });

  it('leaves the list untouched when the assigned rule can no longer be loaded', async () => {
    // Arrange
    readRuleById.mockResolvedValue(undefined);

    // Act
    const pulledIn = await service.ensureAssignedSchedulingRuleIsSelectable('gone-1');

    // Assert
    expect(pulledIn).toBeUndefined();
    expect(service.availableSchedulingRules.length).toBe(1);
  });

  describe('validateContract with inheriting guaranteed hours', () => {
    function contract(guaranteedHours: number | undefined): IContract {
      return {
        ...new Contract(),
        name: 'Contract',
        guaranteedHours,
        minimumHours: 160,
        maximumHours: 200,
        validFrom: new Date(2026, 0, 1),
      };
    }

    it('undefined guaranteedHours produces no bound errors', () => {
      const errors = service.validateContract(contract(undefined));

      expect(errors).toEqual([]);
    });

    it('explicit zero still violates the minimum-hours bound', () => {
      const errors = service.validateContract(contract(0));

      expect(errors.length).toBe(1);
    });

    it('explicit value above maximum is still rejected', () => {
      const errors = service.validateContract(contract(250));

      expect(errors.length).toBe(1);
    });
  });
});

describe('DataManagementContractService - standard rates', () => {
  let service: DataManagementContractService;
  let addContract: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    addContract = vi.fn((contract: IContract) => of({ ...contract, id: 'new-id' }));

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementSchedulingRuleService,
          useValue: { readRuleById: vi.fn(), readSelectableRules: vi.fn().mockResolvedValue([]) },
        },
        { provide: EVENT_BUS_TOKEN, useValue: { emit: vi.fn(), on: vi.fn() } },
        { provide: DataContractService, useValue: { addContract, getList: vi.fn(() => of([])) } },
        {
          provide: DataManagementSettingsService,
          useValue: {
            nightRate: 10,
            holidayRate: 20,
            saRate: 30,
            soRate: 40,
            appSettings: {
              schedulingDefaultSettings: signal({ maximumHours: 200, minimumHours: 0, fullTime: 180 }),
              workSettings: signal({ paymentInterval: 2 }),
              surchargeModeSettings: signal({ we3Rate: 0.5, nightStart: '23:00', nightEnd: '06:00' }),
            },
          },
        },
        { provide: DataManagementCalendarSelectionService, useValue: {} },
        { provide: DataManagementIndividualPeriodService, useValue: {} },
      ],
    });

    service = TestBed.inject(DataManagementContractService);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('a new contract does not copy the settings rates, every rate stays on standard', () => {
    const created = service.createContract();

    expect(created.nightRate).toBeNull();
    expect(created.holidayRate).toBeNull();
    expect(created.we1Rate).toBeNull();
    expect(created.we2Rate).toBeNull();
    expect(created.we3Rate).toBeNull();
    expect(created.performsShiftWork).toBeNull();
  });

  it('saving sends null for standard rates and keeps an explicit 0', async () => {
    service.editContract = {
      ...new Contract(),
      id: undefined,
      name: 'Contract',
      nightRate: null,
      holidayRate: 0,
      we1Rate: 25,
      we2Rate: null,
      we3Rate: 0,
      performsShiftWork: null,
    };

    await service.saveContract();

    const sent = addContract.mock.calls[0][0] as IContract;
    expect(sent.nightRate).toBeNull();
    expect(sent.holidayRate).toBe(0);
    expect(sent.we1Rate).toBe(0.25);
    expect(sent.we2Rate).toBeNull();
    expect(sent.we3Rate).toBe(0);
    expect(sent.performsShiftWork).toBeNull();
  });
});
