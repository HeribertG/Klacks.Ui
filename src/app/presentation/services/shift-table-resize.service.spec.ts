// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { ShiftTableResizeService } from './shift-table-resize.service';

const SCROLL_TOP_EDGE = 65;
const SCROLL_CLIENT_HEIGHT = 1242;
const TABLE_TOP = 316;
const THEAD_HEIGHT = 69;
const FIRST_ROW_HEIGHT = 34;
const SECOND_ROW_HEIGHT = 35;
const RECORD_HEIGHT = FIRST_ROW_HEIGHT + SECOND_ROW_HEIGHT;
const SPACE_BELOW_TABLE = 142;
const SAFETY_MARGIN = 8;
const FIXED_PANEL_BOTTOM = 5000;
const LEGACY_UI_OFFSET = 234;

interface Layout {
  table: HTMLElement;
  scroller: HTMLElement;
  fixedPanel: HTMLElement;
}

function defineNumber(target: object, property: string, value: number): void {
  Object.defineProperty(target, property, { value, configurable: true });
}

function stubRect(element: Element, top: number, height: number): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom: top + height,
    height,
    left: 0,
    right: 0,
    width: 0,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect);
}

function buildLayout(recordCount: number, scrollTop = 0): Layout {
  const scroller = document.createElement('div');
  scroller.style.overflowY = 'auto';
  const host = document.createElement('div');
  const dashboard = document.createElement('div');
  const fixedPanel = document.createElement('div');
  fixedPanel.style.position = 'fixed';
  const card = document.createElement('div');
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  for (let i = 0; i < recordCount; i++) {
    const first = document.createElement('tr');
    const second = document.createElement('tr');
    defineNumber(first, 'clientHeight', FIRST_ROW_HEIGHT);
    defineNumber(second, 'clientHeight', SECOND_ROW_HEIGHT);
    tbody.append(first, second);
  }

  table.append(thead, tbody);
  card.append(table);
  dashboard.append(card);
  host.append(fixedPanel, dashboard);
  scroller.append(host);
  document.body.append(scroller);

  const tbodyHeight = recordCount * RECORD_HEIGHT;
  const tbodyTop = TABLE_TOP + THEAD_HEIGHT - scrollTop;
  const dashboardBottom = tbodyTop + tbodyHeight + SPACE_BELOW_TABLE;

  stubRect(scroller, SCROLL_TOP_EDGE, SCROLL_CLIENT_HEIGHT);
  defineNumber(scroller, 'clientHeight', SCROLL_CLIENT_HEIGHT);
  defineNumber(scroller, 'scrollTop', scrollTop);
  stubRect(tbody, tbodyTop, tbodyHeight);
  stubRect(dashboard, tbodyTop, dashboardBottom - tbodyTop);
  stubRect(fixedPanel, 0, FIXED_PANEL_BOTTOM);

  return { table, scroller, fixedPanel };
}

describe('ShiftTableResizeService', () => {
  let service: ShiftTableResizeService;
  let layout: Layout | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ShiftTableResizeService,
        { provide: LocalStorageService, useValue: { get: vi.fn(), set: vi.fn() } },
      ],
    });

    service = TestBed.inject(ShiftTableResizeService);
    layout = null;
  });

  afterEach(() => {
    layout?.scroller.remove();
    vi.restoreAllMocks();
  });

  describe('calculateAvailableHeight', () => {
    it('adds the free space below the content to the height of the rendered rows', () => {
      layout = buildLayout(9);
      const visibleBottom = SCROLL_TOP_EDGE + SCROLL_CLIENT_HEIGHT;
      const contentBottom = TABLE_TOP + THEAD_HEIGHT + 9 * RECORD_HEIGHT + SPACE_BELOW_TABLE;
      const expected = 9 * RECORD_HEIGHT + (visibleBottom - contentBottom) - SAFETY_MARGIN;

      expect(service.calculateAvailableHeight(layout.table)).toBe(expected);
    });

    it('does not depend on the number of rendered rows', () => {
      const results = [3, 9, 12].map((count) => {
        const built = buildLayout(count);
        const available = service.calculateAvailableHeight(built.table);
        built.scroller.remove();
        return available;
      });

      expect(new Set(results).size).toBe(1);
    });

    it('ignores the scroll position of the container', () => {
      const unscrolled = buildLayout(9);
      const expected = service.calculateAvailableHeight(unscrolled.table);
      unscrolled.scroller.remove();

      layout = buildLayout(9, 120);

      expect(service.calculateAvailableHeight(layout.table)).toBe(expected);
    });

    it('ignores fixed positioned siblings of the content', () => {
      layout = buildLayout(9);

      expect(service.calculateAvailableHeight(layout.table)).toBeLessThan(FIXED_PANEL_BOTTOM);
      expect(service.calculateAvailableHeight(layout.table)).toBeGreaterThan(0);
    });

    it('returns a smaller value when the content overflows the container', () => {
      const fitting = buildLayout(9);
      const fittingHeight = service.calculateAvailableHeight(fitting.table);
      fitting.scroller.remove();

      layout = buildLayout(9);
      defineNumber(layout.scroller, 'clientHeight', SCROLL_CLIENT_HEIGHT - 300);
      stubRect(layout.scroller, SCROLL_TOP_EDGE, SCROLL_CLIENT_HEIGHT - 300);

      expect(service.calculateAvailableHeight(layout.table)).toBe(fittingHeight - 300);
    });

    it('falls back to the fixed offset when no scroll container exists', () => {
      const table = document.createElement('table');
      table.append(document.createElement('tbody'));
      document.body.append(table);
      stubRect(table, TABLE_TOP, 0);
      Object.defineProperty(window, 'innerHeight', { value: 1325, configurable: true });

      expect(service.calculateAvailableHeight(table)).toBe(1325 - TABLE_TOP - LEGACY_UI_OFFSET);

      table.remove();
    });
  });

  describe('calculateOptimalRowCount', () => {
    it('does not clamp a real record height of 69px up to a larger floor', () => {
      layout = buildLayout(9);

      const available = service.calculateAvailableHeight(layout.table);

      expect(service.calculateOptimalRowCount(layout.table)).toBe(Math.floor(available / RECORD_HEIGHT));
    });

    it('fits eleven records for the reported 1325px viewport instead of nine', () => {
      layout = buildLayout(9);

      expect(service.calculateOptimalRowCount(layout.table)).toBe(11);
    });

    it('returns the same count regardless of how many records are currently rendered', () => {
      const counts = [3, 9, 11, 14].map((count) => {
        const built = buildLayout(count);
        const result = service.calculateOptimalRowCount(built.table);
        built.scroller.remove();
        return result;
      });

      expect(new Set(counts).size).toBe(1);
    });

    it('uses the default record height when no rows are rendered', () => {
      layout = buildLayout(0);
      const available = service.calculateAvailableHeight(layout.table);

      expect(service.calculateOptimalRowCount(layout.table)).toBe(Math.floor(available / 70));
    });

    it('never returns fewer than the minimum items per page', () => {
      layout = buildLayout(9);
      defineNumber(layout.scroller, 'clientHeight', 10);
      stubRect(layout.scroller, SCROLL_TOP_EDGE, 10);

      expect(service.calculateOptimalRowCount(layout.table)).toBe(3);
    });

    it('respects the maxItems limit', () => {
      layout = buildLayout(9);

      expect(service.calculateOptimalRowCount(layout.table, 5)).toBe(5);
    });
  });

  describe('markup coverage', () => {
    it('measures two table rows per record', () => {
      layout = buildLayout(4);
      const tbody = layout.table.querySelector('tbody') as HTMLTableSectionElement;

      expect(tbody.rows.length).toBe(8);
      expect((service as any).measureAverageRowHeight(layout.table)).toBe(RECORD_HEIGHT);
    });
  });
});
