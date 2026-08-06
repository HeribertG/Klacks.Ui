// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementContractService } from './data-management-contract.service';
import { DataManagementSchedulingRuleService } from '../scheduling/data-management-scheduling-rule.service';
import { DataManagementCalendarSelectionService } from '../calendar/data-management-calendar-selection.service';
import { DataManagementIndividualPeriodService } from '../scheduling/data-management-individual-period.service';
import { DataManagementSettingsService } from '../settings/data-management-settings.service';
import { DataContractService } from 'src/app/infrastructure/api/contract/data-contract.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { ISchedulingRule } from '../../models/scheduling/scheduling-rule.model';

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
});
