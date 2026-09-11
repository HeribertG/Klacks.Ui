// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { ScheduleConductorContextService } from './schedule-conductor-context.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AgentFactoryService } from 'src/app/domain/services/automation/agent/agent-factory.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { useTimeZone } from 'src/app/shared/testing/time-zone.testing';

function buildScheduleStub(): DataManagementScheduleService {
  return {
    shiftSchedules: [
      {
        shiftId: 'shift-1',
        date: '2026-08-01T00:00:00Z',
        dayOfWeek: 6,
        shiftName: 'Early',
        abbreviation: 'E',
        startShift: '06:00',
        endShift: '14:00',
        workTime: 8,
        isSporadic: false,
        isTimeRange: false,
        shiftType: 0,
        isInTemplateContainer: false,
        sumEmployees: 1,
        quantity: 1,
        engaged: 0,
      },
    ],
    clients: [{ id: 'client-1' }],
    visibleStartDate: new Date(2026, 7, 1),
    visibleEndDate: new Date(2026, 7, 7),
    periodHours: new Map(),
  } as unknown as DataManagementScheduleService;
}

describe('ScheduleConductorContextService.mapShifts across the CoreShift re-serialization step', () => {
  describe('Europe/Zurich', () => {
    useTimeZone('Europe/Zurich');

    it('keeps the backend calendar day when re-serialized the way conductor/mutation/fitness services do', () => {
      TestBed.configureTestingModule({
        providers: [
          ScheduleConductorContextService,
          { provide: DataManagementScheduleService, useValue: buildScheduleStub() },
          { provide: AgentFactoryService, useValue: { createAgents: () => [] } },
          { provide: AppSettingsManagementService, useValue: { schedulingDefaultSettings: () => ({}) } },
        ],
      });

      const service = TestBed.inject(ScheduleConductorContextService);
      const context = service.buildContext();

      expect(context).not.toBeNull();
      const shift = context!.shifts[0];
      const reSerialized = shift.date instanceof Date ? formatDateOnly(shift.date) : String(shift.date);
      expect(reSerialized).toBe('2026-08-01');
    });
  });
});
