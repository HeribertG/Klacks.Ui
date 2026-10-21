// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { IShift } from '../../models/shift/shift.interface';
import { IContainerTemplate } from '../../models/container/container-template-class';
import { IContainerTemplateItem } from '../../models/container/container-template-item.interface';
import { DataContainerTemplateService } from '../../../infrastructure/api/container/data-container-template.service';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from '../../interfaces/manageable-service-registry.interface';
import { FT_HOLIDAY_TEMPLATE_WEEKDAY } from '../../constants/container-template-holiday.constants';
import { ContainerTemplateShiftService } from './container-template-shift.service';
import { DataManagementContainerService } from './data-management.container.service';

const CONTAINER_ID = 'container-1';
const MONDAY = 1;
const MONDAY_NAME = 'monday';

const createContainer = (overrides: Partial<IShift>): IShift =>
  ({
    id: CONTAINER_ID,
    startShift: '08:00:00',
    endShift: '16:00:00',
    cuttingAfterMidnight: false,
    isMonday: true,
    isTuesday: false,
    isWednesday: false,
    isThursday: false,
    isFriday: false,
    isSaturday: false,
    isSunday: false,
    isHoliday: false,
    isWeekdayAndHoliday: false,
    ...overrides,
  }) as IShift;

const createItem = (shiftId: string): IContainerTemplateItem =>
  ({ id: `item-${shiftId}`, shiftId, briefingTime: '00:00', debriefingTime: '00:00' }) as IContainerTemplateItem;

const createTemplate = (
  id: string,
  weekday: number,
  isHoliday: boolean,
  isWeekdayAndHoliday: boolean,
  shiftId: string,
): IContainerTemplate => ({
  id,
  containerId: CONTAINER_ID,
  weekday,
  fromTime: '08:00:00',
  untilTime: '16:00:00',
  isHoliday,
  isWeekdayAndHoliday,
  containerTemplateItems: [createItem(shiftId)],
});

describe('DataManagementContainerService holiday template round trip', () => {
  let storedTemplates: IContainerTemplate[];
  let savedTemplates: IContainerTemplate[] | undefined;
  let service: DataManagementContainerService;
  let shiftService: ContainerTemplateShiftService;

  const load = (container: IShift): void => {
    service.initializeTemplateGrid(container).subscribe();
    service.loadTemplates(CONTAINER_ID).subscribe();
  };

  const itemShiftIds = (bufferKey: string): (string | undefined)[] =>
    (shiftService.getAllWeekdayTasks()[bufferKey] ?? []).map((item) => item.shiftId);

  const savedShiftIds = (isHoliday: boolean): (string | undefined)[] =>
    (savedTemplates ?? [])
      .filter((t) => t.weekday === MONDAY && t.isHoliday === isHoliday)
      .flatMap((t) => t.containerTemplateItems.map((item) => item.shiftId));

  beforeEach(() => {
    savedTemplates = undefined;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DataContainerTemplateService,
          useValue: {
            getTemplates: () => of(storedTemplates),
            getAvailableTasks: () => of([]),
            putTemplates: (_: string, templates: IContainerTemplate[]) => {
              savedTemplates = templates;
              return of(templates);
            },
            postTemplates: (_: string, templates: IContainerTemplate[]) => {
              savedTemplates = templates;
              return of(templates);
            },
          },
        },
        { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: { register: () => undefined } },
      ],
    });
    service = TestBed.inject(DataManagementContainerService);
    shiftService = TestBed.inject(ContainerTemplateShiftService);
    shiftService.clearAllTasks();
  });

  it('restores the normal and the +FT holiday template of a weekday into separate buffers', () => {
    storedTemplates = [
      createTemplate('t-normal', MONDAY, false, false, 'normal-shift'),
      createTemplate('t-holiday', MONDAY, true, true, 'holiday-shift'),
    ];

    load(createContainer({ isWeekdayAndHoliday: true }));

    expect(itemShiftIds(MONDAY_NAME)).toEqual(['normal-shift']);
    expect(itemShiftIds(ContainerTemplateShiftService.bufferKey(MONDAY_NAME, true))).toEqual(['holiday-shift']);
  });

  it('saves each buffer back into its own template without overwriting the other variant', () => {
    storedTemplates = [
      createTemplate('t-normal', MONDAY, false, false, 'normal-shift'),
      createTemplate('t-holiday', MONDAY, true, true, 'holiday-shift'),
    ];
    load(createContainer({ isWeekdayAndHoliday: true }));

    shiftService.setCurrentWeekday(ContainerTemplateShiftService.bufferKey(MONDAY_NAME, true));
    shiftService.addTask(createItem('extra-holiday-shift'));
    service.save();

    expect(savedShiftIds(false)).toEqual(['normal-shift']);
    expect(savedShiftIds(true)).toEqual(['holiday-shift', 'extra-holiday-shift']);
    expect(savedTemplates?.find((t) => t.isHoliday)?.id).toBe('t-holiday');
  });

  it('creates the normal template of an FT container instead of writing weekday items into the holiday template', () => {
    storedTemplates = [
      createTemplate('t-ft-holiday', FT_HOLIDAY_TEMPLATE_WEEKDAY, true, false, 'holiday-shift'),
    ];
    load(createContainer({ isHoliday: true }));

    shiftService.setCurrentWeekday(MONDAY_NAME);
    shiftService.addTask(createItem('weekday-shift'));
    service.save();

    expect(savedShiftIds(false)).toEqual(['weekday-shift']);
    expect(savedShiftIds(true)).toEqual(['holiday-shift']);
    expect(savedTemplates?.find((t) => !t.isHoliday)?.isWeekdayAndHoliday).toBe(false);
  });
});
