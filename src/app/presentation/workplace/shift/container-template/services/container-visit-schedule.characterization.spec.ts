// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Characterization of the container visit schedule against the production services. The cases live in
 * container-visit-schedule-cases.json, a byte-identical copy of which drives the Klacks.Api port in Klacks.UnitTest;
 * both sides pin the same SHA-256, so a case edited on one side only fails on both.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { RouteOptimizationService } from 'src/app/domain/services/route-optimization.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SpinnerService } from 'src/app/presentation/spinner/spinner.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AddressProviderService } from 'src/app/domain/services/address-provider.service';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { createGeoServicesConfigMock } from 'src/app/shared/testing/geo-services-config.testing';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { IRouteOptimizationResult } from 'src/app/domain/services/route-optimization-result.interface';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { ContainerTemplateRouteService } from './container-template-route.service';
import { ContainerTemplateItemManipulationService } from './container-template-item-manipulation.service';

const CASES_SHA256 = '43b077bb6c105ebe94690566a83459003ad75d465ec98419b45b1b59df2df9e7';
const SPEC_DIR = dirname(fileURLToPath(import.meta.url));
const CASES_PATH = resolve(SPEC_DIR, '..', '..', '..', '..', '..', 'shared', 'testing', 'container-visit-schedule-cases.json');
const SELECTED_WEEKDAY = 'thursday';
const THURSDAY = 4;

interface CaseItemOutput {
  key: string | null;
  timeRangeStartItem: string | null;
  timeRangeEndItem: string | null;
  travelTimeBefore: string;
  travelTimeAfter: string;
}

interface CaseTimeBlockOutput {
  id: string;
  fixedStartTime: string | null;
  fixedEndTime: string | null;
  durationMinutes: number;
  isMovable: boolean;
}

interface CaseOutput {
  items: CaseItemOutput[] | null;
  timeBlocks: CaseTimeBlockOutput[];
}

interface VisitScheduleCase {
  name: string;
  containerFromTime: string;
  route: unknown;
  items: IContainerTemplateItem[];
  expected: CaseOutput | null;
}

interface VisitScheduleCaseFile {
  cases: VisitScheduleCase[];
}

const rawCases = readFileSync(CASES_PATH, 'utf-8').split('\r\n').join('\n');
const caseFile = JSON.parse(rawCases) as VisitScheduleCaseFile;

function toItemOutput(item: IContainerTemplateItem): CaseItemOutput {
  return {
    key: item.shiftId ?? item.absenceId ?? null,
    timeRangeStartItem: item.timeRangeStartItem,
    timeRangeEndItem: item.timeRangeEndItem,
    travelTimeBefore: item.travelTimeBefore,
    travelTimeAfter: item.travelTimeAfter,
  };
}

function createService(setSelected: ReturnType<typeof vi.fn>): ContainerTemplateRouteService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      ContainerTemplateRouteService,
      ContainerTemplateItemManipulationService,
      { provide: RouteOptimizationService, useValue: {} },
      {
        provide: DataManagementContainerService,
        useValue: { getWeekdayNumber: () => THURSDAY, updateTaskOrderInTemplates: vi.fn(), updateRouteInfo: vi.fn() },
      },
      {
        provide: ContainerTemplateShiftService,
        useValue: { selectedContainerTemplateItemsSignal: () => [], setSelectedContainerTemplateItems: setSelected },
      },
      { provide: ToastShowService, useValue: {} },
      { provide: TranslateService, useValue: { instant: (key: string) => key } },
      { provide: SpinnerService, useValue: {} },
      { provide: WorkplaceStateService, useValue: { areObjectsDirty: vi.fn() } },
      { provide: AddressProviderService, useValue: {} },
      { provide: AppSettingsManagementService, useValue: {} },
      { provide: TableSortingService, useValue: { restoreSortState: vi.fn() } },
      { provide: DataShiftService, useValue: {} },
      { provide: GeoServicesConfigService, useValue: createGeoServicesConfigMock() },
    ],
  });
  return TestBed.inject(ContainerTemplateRouteService);
}

function runCase(testCase: VisitScheduleCase): CaseOutput {
  const setSelected = vi.fn();
  const service = createService(setSelected);
  const [hours, minutes] = testCase.containerFromTime.split(':');
  const items = structuredClone(testCase.items);

  service.applyOptimizedRoute(
    structuredClone(testCase.route) as IRouteOptimizationResult,
    items,
    new OwnTime(hours, minutes),
    SELECTED_WEEKDAY,
    false,
  );

  const written = setSelected.mock.calls.length > 0
    ? (setSelected.mock.calls[0][0] as IContainerTemplateItem[]).map(toItemOutput)
    : null;
  const timeBlocks = service
    .convertAbsencesToTimeBlocks(structuredClone(testCase.items).filter((item) => !!item.absenceId))
    .map((block) => ({
      id: block.id,
      fixedStartTime: block.fixedStartTime ?? null,
      fixedEndTime: block.fixedEndTime ?? null,
      durationMinutes: block.durationMinutes,
      isMovable: block.isMovable,
    }));

  return { items: written, timeBlocks };
}

describe('container visit schedule characterization', () => {
  const actuals: Record<string, CaseOutput> = {};

  beforeAll(() => {
    for (const testCase of caseFile.cases) {
      actuals[testCase.name] = runCase(testCase);
    }
  });

  it('pins the shared case file by its SHA-256', () => {
    // Arrange
    const hash = createHash('sha256').update(rawCases, 'utf-8').digest('hex');

    // Assert
    expect(hash).toBe(CASES_SHA256);
  });

  it('has at least fourteen cases with unique names', () => {
    // Arrange
    const names = caseFile.cases.map((testCase) => testCase.name);

    // Assert
    expect(names.length).toBeGreaterThanOrEqual(14);
    expect(new Set(names).size).toBe(names.length);
  });

  for (const testCase of caseFile.cases) {
    it(`matches the oracle: ${testCase.name}`, () => {
      // Act
      const actual = actuals[testCase.name];

      // Assert
      expect(actual).toEqual(testCase.expected);
    });
  }
});
