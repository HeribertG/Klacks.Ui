// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { CreateScenarioDialogComponent } from './create-scenario-dialog.component';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { ICreateAnalyseScenarioRequest } from 'src/app/domain/models/schedule/create-analyse-scenario-request.interface';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';

const GROUP_ID = 'bern-objektschutz';

interface ScheduleDates {
  visibleStartDate: Date | null;
  visibleEndDate: Date | null;
  periodStartDate: Date | null;
  periodEndDate: Date | null;
}

describe.each(CALENDAR_TEST_ZONES)('CreateScenarioDialogComponent scenario period in %s', (zone) => {
  useTimeZone(zone);

  let createScenario: ReturnType<typeof vi.fn>;
  let schedule: ScheduleDates;
  let selectedGroup: { id: string } | undefined;
  let dialog: CreateScenarioDialogComponent;

  const confirm = (): ICreateAnalyseScenarioRequest | undefined => {
    dialog.scenarioName.set('Winter plan');
    dialog.onConfirm();
    return createScenario.mock.calls.at(-1)?.[0] as ICreateAnalyseScenarioRequest | undefined;
  };

  beforeEach(() => {
    createScenario = vi.fn().mockReturnValue(of({ id: 'scenario-1' }));
    selectedGroup = { id: GROUP_ID };
    schedule = {
      visibleStartDate: new Date(2026, 10, 28),
      visibleEndDate: new Date(2027, 0, 3),
      periodStartDate: new Date(2026, 11, 1),
      periodEndDate: new Date(2026, 11, 31),
    };

    TestBed.configureTestingModule({
      imports: [CreateScenarioDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AnalyseScenarioService, useValue: { createScenario } },
        { provide: DataManagementScheduleService, useValue: schedule },
        {
          provide: GroupSelectionService,
          useValue: {
            get selectedGroup() {
              return selectedGroup;
            },
          },
        },
        { provide: NgbModal, useValue: { open: vi.fn() } },
      ],
    });

    dialog = TestBed.createComponent(CreateScenarioDialogComponent).componentInstance;
  });

  it('creates the scenario for the planning period, not for the padded visible weeks', () => {
    const request = confirm();

    expect(request?.fromDate).toBe('2026-12-01');
    expect(request?.untilDate).toBe('2026-12-31');
    expect(request?.groupId).toBe(GROUP_ID);
  });

  it('uses the same period without a selected group', () => {
    selectedGroup = undefined;

    const request = confirm();

    expect(request?.fromDate).toBe('2026-12-01');
    expect(request?.untilDate).toBe('2026-12-31');
    expect(request?.groupId).toBeUndefined();
  });

  it('follows a weekly planning period', () => {
    schedule.visibleStartDate = new Date(2026, 11, 4);
    schedule.visibleEndDate = new Date(2026, 11, 16);
    schedule.periodStartDate = new Date(2026, 11, 7);
    schedule.periodEndDate = new Date(2026, 11, 13);

    const request = confirm();

    expect(request?.fromDate).toBe('2026-12-07');
    expect(request?.untilDate).toBe('2026-12-13');
  });

  it('creates nothing and reports the missing range when the schedule has no period', () => {
    schedule.periodStartDate = null;
    schedule.periodEndDate = null;

    const request = confirm();

    expect(request).toBeUndefined();
    expect(dialog.errorMessage()).toBe('scenario.error.noDateRange');
  });
});
