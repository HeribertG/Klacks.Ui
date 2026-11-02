// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ContainerWorkChildrenService } from 'src/app/domain/services/schedule/container-work-children.service';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { DataAbsenceService } from 'src/app/infrastructure/api/absence/data-absence.service';
import { DataContainerTemplateService } from 'src/app/infrastructure/api/container/data-container-template.service';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { ContainerTemplateRouteService } from 'src/app/presentation/workplace/shift/container-template/services/container-template-route.service';
import { ContainerWorkModalLifecycleService } from './container-work-modal-lifecycle.service';
import { WorkChangeResource } from 'src/app/domain/models/workchange/work-change-resource.interface';

describe('ContainerWorkModalLifecycleService work changes', () => {
  let service: ContainerWorkModalLifecycleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ContainerWorkModalLifecycleService,
        {
          provide: ContainerWorkChildrenService,
          useValue: { loadChildren: () => of({ subWorks: [], subBreaks: [], subWorkChanges: [] }) },
        },
        { provide: ContainerTemplateRouteService, useValue: {} },
        { provide: DataShiftService, useValue: { getShift: () => of({}), getShiftsByIds: () => of([]) } },
        { provide: DataAbsenceService, useValue: { readAbsenceList: () => of([]) } },
        { provide: DataContainerTemplateService, useValue: { getAvailableTasks: () => of([]) } },
        { provide: WorkScheduleLoaderService, useValue: {} },
      ],
    });
    service = TestBed.inject(ContainerWorkModalLifecycleService);
  });

  it('marks the briefing, debriefing and travel entries of a container item as billable', () => {
    const item = {
      id: 'item-1',
      shiftId: 'shift-1',
      startItem: '08:00:00',
      endItem: '12:00:00',
      briefingTime: '00:15:00',
      debriefingTime: '00:15:00',
      travelTimeBefore: '00:15:00',
      travelTimeAfter: '00:15:00',
    } as unknown as IContainerTemplateItem;

    const built = (
      service as unknown as { buildChildrenFromItems: (items: IContainerTemplateItem[]) => { subWorkChanges: WorkChangeResource[] } }
    ).buildChildrenFromItems([item]);

    expect(built.subWorkChanges).toHaveLength(4);
    expect(built.subWorkChanges.every((change) => change.toInvoice)).toBe(true);
  });
});
