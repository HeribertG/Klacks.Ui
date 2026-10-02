// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests for the route table and summary values of the route PDF export.
 * @param buildRouteTableData - Builds the "Route Details" rows (arrival, departure, travel time, distance)
 * @param buildSummaryTravelTime - Builds the pure driving time shown as "Total Travel Time"
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { LocaleService } from 'src/app/application/services/locale.service';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import {
  IContainerTemplateItem,
  IRouteInfo,
} from 'src/app/domain/models/container/container-template-class';
import { MapRenderingService } from './map-rendering.service';
import { RoutePdfExportService } from './route-pdf-export.service';
import { PdfUnicodeTextService } from 'src/app/domain/services/report/pdf-unicode-text.service';

const BASE = 'Neuwiesenstrasse 20, 8401 Winterthur';
const SHIFT_A = 'shift-a';
const SHIFT_B = 'shift-b';
const SHIFT_C = 'shift-c';
const SHIFT_D = 'shift-d';
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

function step(
  order: number,
  shiftId: string,
  distanceToNextKm: number,
  travelTimeToNext: string,
): IRouteInfo['optimizedRoute'][number] {
  return {
    order,
    shiftId,
    name: shiftId,
    address: shiftId,
    latitude: 47.5,
    longitude: 8.7,
    distanceToNextKm,
    travelTimeToNext,
  };
}

function buildLiveRouteInfo(): IRouteInfo {
  return {
    startBase: BASE,
    endBase: BASE,
    totalDistanceKm: 14.784530104582718,
    estimatedTravelTime: '02:47:44.4861675',
    travelTimeFromStartBase: '00:00:00',
    distanceFromStartBaseKm: 0,
    distanceToEndBaseKm: 1.8775437001787514,
    travelTimeToEndBase: '00:02:15.1831464',
    optimizedRoute: [
      step(1, EMPTY_GUID, 2.47185277152788, '00:02:57.9733995'),
      step(2, SHIFT_B, 3.0613852796058008, '00:03:40.4197401'),
      step(3, SHIFT_D, 4.909654333789075, '00:05:53.4951120'),
      step(4, SHIFT_A, 2.4640940194812098, '00:02:57.4147694'),
      step(5, SHIFT_C, 1.8775437001787514, '00:02:15.1831464'),
      step(6, EMPTY_GUID, 0, '00:00:00'),
    ],
  };
}

function buildItem(shiftId: string, workTimeHours: number, travelTimeBefore: string): IContainerTemplateItem {
  return {
    id: shiftId,
    shiftId,
    shift: { workTime: workTimeHours } as unknown as IShift,
    briefingTime: '00:00',
    debriefingTime: '00:00',
    travelTimeAfter: '00:00',
    travelTimeBefore,
    timeRangeStartItem: null,
    timeRangeEndItem: null,
  };
}

describe('RoutePdfExportService', () => {
  let service: RoutePdfExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RoutePdfExportService,
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: LocaleService, useValue: { getLocale: () => 'de-CH' } },
        { provide: MapRenderingService, useValue: {} },
        { provide: PdfUnicodeTextService, useValue: { prepareDocument: async () => undefined } },
      ],
    });
    service = TestBed.inject(RoutePdfExportService);
  });

  describe('buildSummaryTravelTime', () => {
    it('shows pure driving time, not travel plus on-site time', () => {
      expect(service.buildSummaryTravelTime(buildLiveRouteInfo())).toBe('00:18');
    });

    it('returns a dash when the route has no legs', () => {
      const routeInfo = { ...buildLiveRouteInfo(), optimizedRoute: [] };
      expect(service.buildSummaryTravelTime(routeInfo)).toBe('-');
    });
  });

  describe('buildRouteTableData', () => {
    const optimizedItems = (): IContainerTemplateItem[] => [
      buildItem(SHIFT_B, 0.5, '00:05'),
      buildItem(SHIFT_D, 0.75, '00:05'),
      buildItem(SHIFT_A, 0.75, '00:05'),
      buildItem(SHIFT_C, 0.5, '00:05'),
    ];

    it('shows the distance of the leg that arrives at each stop', () => {
      const rows = service.buildRouteTableData(optimizedItems(), buildLiveRouteInfo(), '08:00:00');

      expect(rows[1][5]).toBe('2.47 km');
      expect(rows[2][5]).toBe('3.06 km');
      expect(rows[3][5]).toBe('4.91 km');
      expect(rows[4][5]).toBe('2.46 km');
      expect(rows[5][5]).toBe('1.88 km');
    });

    it('shows the real leg travel time per row, not the planned gap between items', () => {
      const rows = service.buildRouteTableData(optimizedItems(), buildLiveRouteInfo(), '08:00:00');

      expect(rows.slice(1, 5).map((row) => row[4])).toEqual(['00:03', '00:04', '00:06', '00:03']);
      expect(rows[5][4]).toBe('00:02');
      expect(rows[1][2]).toBe('08:05');
    });

    it('makes the rows sum up to the summary driving time', () => {
      const routeInfo = buildLiveRouteInfo();
      const rows = service.buildRouteTableData(optimizedItems(), routeInfo, '08:00:00');

      const rowMinutes = rows.slice(1).reduce((sum, row) => {
        const [hours, minutes] = row[4].split(':').map(Number);
        return sum + hours * 60 + minutes;
      }, 0);

      expect(service.buildSummaryTravelTime(routeInfo)).toBe('00:18');
      expect(rowMinutes).toBe(18);
    });

    it('always shows the start row without travel time and distance (autofill result)', () => {
      const autofillInfo: IRouteInfo = {
        ...buildLiveRouteInfo(),
        distanceFromStartBaseKm: 2.47185277152788,
        travelTimeFromStartBase: '00:05:00',
      };

      const rows = service.buildRouteTableData(optimizedItems(), autofillInfo, '08:00:00');

      expect(rows[0][4]).toBe('00:00');
      expect(rows[0][5]).toBe('-');
      expect(rows[1][5]).toBe('2.47 km');
    });

    it('sums the displayed distances to the total distance', () => {
      const routeInfo = buildLiveRouteInfo();
      const rows = service.buildRouteTableData(optimizedItems(), routeInfo, '08:00:00');

      const distanceSum = rows
        .slice(1)
        .reduce((sum, row) => sum + parseFloat(row[5]), 0);

      expect(distanceSum).toBeCloseTo(routeInfo.totalDistanceKm, 1);
    });

    it('falls back to the route leg when an item carries no travel time', () => {
      const items = optimizedItems().map((item) => ({ ...item, travelTimeBefore: '00:00' }));
      const rows = service.buildRouteTableData(items, buildLiveRouteInfo(), '08:00:00');

      expect(rows[1][4]).toBe('00:03');
      expect(rows[1][2]).toBe('08:03');
      expect(rows[2][4]).toBe('00:04');
      expect(rows[3][4]).toBe('00:06');
    });
  });
});
