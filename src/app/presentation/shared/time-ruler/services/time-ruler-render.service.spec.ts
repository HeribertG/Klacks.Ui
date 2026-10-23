// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { Rectangle } from 'src/app/domain/models/geometry/rectangle.model';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { IAbsence } from 'src/app/domain/models/absence/absence.interface';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { DrawHelper } from '../../../helpers/draw-helper';
import { TimeRulerRenderService } from './time-ruler-render.service';
import { TimeRulerBlockSelectionService } from './time-ruler-block-selection.service';
import { IShiftSceneContext } from './shift-scene-context.interface';

const GRID_COLORS = {
  mainFontColor: '#101010',
  warningColor: '#ee0000',
  focusBorderColor: '#1e90ff',
  borderColor: '#abad94',
  controlBackGroundColor: '#d5dbdb',
  backGroundColor: '#f2eded',
  toolTipBackGroundColor: '#fafafa',
};
const PIXEL_DATA = [12, 34, 56, 255];
const MEASURED_TEXT_WIDTH = 50;
const CONTAINER_WIDTH = 270;
const CONTAINER_HEIGHT = 720;
const BOUNDARY_WIDTH = 200;
const RENDER_CANVAS_SCALE = 2;
const FROM = OwnTime.forTime('08', '00');
const UNTIL = OwnTime.forTime('10', '00');

let log: string[];
let labels: WeakMap<object, string>;
let contexts: WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>;
let canvasCounter: number;
let gradientCounter: number;
let nullContexts: boolean;

function fmt(value: unknown): string {
  if (typeof value === 'number') {
    return String(Math.round(value * 1000) / 1000);
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Rectangle) {
    return `R(${fmt(value.left)},${fmt(value.top)},${fmt(value.right)},${fmt(value.bottom)})`;
  }
  if (Array.isArray(value)) {
    return `[${value.map(fmt).join(',')}]`;
  }
  if (value !== null && typeof value === 'object' && labels.has(value)) {
    return labels.get(value)!;
  }
  return JSON.stringify(value);
}

function labelOf(target: object): string {
  if (!labels.has(target)) {
    labels.set(target, `canvas${++canvasCounter}`);
  }
  return labels.get(target)!;
}

function specialResult(prop: string): unknown {
  if (prop === 'measureText') {
    return { width: MEASURED_TEXT_WIDTH };
  }
  if (prop === 'getImageData') {
    return { data: PIXEL_DATA };
  }
  if (prop === 'createLinearGradient') {
    const gradientLabel = `gradient${++gradientCounter}`;
    const gradient = {
      addColorStop: (offset: number, color: string): void => {
        log.push(`${gradientLabel}.addColorStop(${fmt(offset)}, ${color})`);
      },
    };
    labels.set(gradient, gradientLabel);
    return gradient;
  }
  return undefined;
}

function createContext(label: string, canvas?: HTMLCanvasElement): CanvasRenderingContext2D {
  const state: Record<string, unknown> = {};
  const proxy = new Proxy({}, {
    get(_target, prop): unknown {
      if (typeof prop === 'symbol') {
        return undefined;
      }
      if (prop === 'canvas') {
        return canvas;
      }
      if (prop in state) {
        return state[prop];
      }
      return (...args: unknown[]): unknown => {
        log.push(`${label}.${prop}(${args.map(fmt).join(', ')})`);
        return specialResult(prop);
      };
    },
    set(_target, prop, value): boolean {
      state[String(prop)] = value;
      log.push(`${label}.${String(prop)}=${fmt(value)}`);
      return true;
    },
  });
  labels.set(proxy, label);
  return proxy as unknown as CanvasRenderingContext2D;
}

function installCanvasFakes(): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    if (nullContexts) {
      return null;
    }
    const label = labelOf(this);
    log.push(`${label}.getContext`);
    if (!contexts.has(this)) {
      contexts.set(this, createContext(label, this));
    }
    return contexts.get(this)!;
  } as never);
  vi.spyOn(DrawHelper, 'fillRectangle').mockImplementation((ctx, color, rec) => {
    log.push(`${fmt(ctx)} fillRectangle(${color}, ${fmt(rec)})`);
  });
  vi.spyOn(DrawHelper, 'drawBaseBorder').mockImplementation((ctx, color, lineWidth, rec) => {
    log.push(`${fmt(ctx)} drawBaseBorder(${color}, ${fmt(lineWidth)}, ${fmt(rec)})`);
  });
  vi.spyOn(DrawHelper, 'drawBorder').mockImplementation((ctx, x, y, w, h, color, deep, style) => {
    log.push(`${fmt(ctx)} drawBorder(${[x, y, w, h].map(fmt).join(', ')}, ${color}, ${fmt(deep)}, ${fmt(style)})`);
  });
  vi.spyOn(DrawHelper, 'drawText').mockImplementation((ctx, text, x, y, w, h, font, size, color, align, baseline) => {
    log.push(`${fmt(ctx)} drawText(${text}, ${[x, y, w, h].map(fmt).join(', ')}, ${font}, ${fmt(size)}, ${color}, ` +
      `${fmt(align)}, ${fmt(baseline)})`);
  });
}

function createHostedCanvas(label: string): HTMLCanvasElement {
  const host = document.createElement('div');
  Object.defineProperty(host, 'clientWidth', { value: CONTAINER_WIDTH });
  Object.defineProperty(host, 'clientHeight', { value: CONTAINER_HEIGHT });
  const canvas = document.createElement('canvas');
  host.appendChild(canvas);
  labels.set(canvas, label);
  return canvas;
}

function createRenderCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = BOUNDARY_WIDTH * RENDER_CANVAS_SCALE;
  canvas.height = CONTAINER_HEIGHT * RENDER_CANVAS_SCALE;
  canvas.style.width = `${BOUNDARY_WIDTH}px`;
  canvas.style.height = `${CONTAINER_HEIGHT}px`;
  labels.set(canvas, 'render');
  return canvas;
}

function shiftItem(start: string, end: string, shift: Partial<IShift> = {}, times: Partial<IContainerTemplateItem> = {}):
  IContainerTemplateItem {
  return {
    shiftId: 'shift-1',
    shift: { isTimeRange: true, abbreviation: 'FR', name: 'Early', startShift: '07:45', endShift: '09:15', ...shift } as IShift,
    startItem: start,
    endItem: end,
    timeRangeStartItem: start,
    timeRangeEndItem: end,
    briefingTime: '',
    debriefingTime: '',
    travelTimeBefore: '',
    travelTimeAfter: '',
    ...times,
  };
}

function recordRectangles(map: Map<IContainerTemplateItem, Rectangle>, items: Record<string, IContainerTemplateItem>): void {
  const entries = Object.entries(items).map(([name, item]) => `${name}=${map.has(item) ? fmt(map.get(item)) : '-'}`);
  log.push(`rectangles ${entries.join(' ')}`);
}

describe('TimeRulerRenderService - characterization', () => {
  let service: TimeRulerRenderService;

  const expectLog = (name: string): void => {
    expect(GOLDEN[name], `missing golden ${name}`).toBeDefined();
    expect(log).toEqual(GOLDEN[name]);
  };

  beforeEach(() => {
    log = [];
    labels = new WeakMap();
    contexts = new WeakMap();
    canvasCounter = 0;
    gradientCounter = 0;
    nullContexts = false;
    document.documentElement.dir = '';
    installCanvasFakes();

    TestBed.configureTestingModule({
      providers: [
        TimeRulerBlockSelectionService,
        { provide: GridColorService, useValue: GRID_COLORS },
        { provide: TranslateService, useValue: { currentLang: 'de' } },
      ],
    });
    service = TestBed.inject(TimeRulerRenderService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.dir = '';
  });

  describe('layout constants', () => {
    it('exposes the ruler width and the content offset per text direction', () => {
      expect(service.RULER_WIDTH).toBe(70);
      expect(service.contentOffsetX).toBe(0);
      document.documentElement.dir = 'rtl';
      expect(service.contentOffsetX).toBe(70);
    });

    it('pads the display window by the duration of the time window', () => {
      expect(service.calculatePaddingMinutes(FROM, UNTIL)).toBe(10);
      expect(service.calculatePaddingMinutes(FROM, OwnTime.forTime('11', '00'))).toBe(10);
      expect(service.calculatePaddingMinutes(FROM, OwnTime.forTime('14', '00'))).toBe(15);
      expect(service.calculatePaddingMinutes(FROM, OwnTime.forTime('14', '01'))).toBe(30);
      expect(service.calculatePaddingMinutes(OwnTime.forTime('22', '00'), OwnTime.forTime('02', '00'))).toBe(15);
      expect(service.calculatePaddingMinutes(FROM, FROM)).toBe(30);
    });

    it('computes the shift box parameters from the padded display range', () => {
      const params = service.calculateShiftBoxParameters(BOUNDARY_WIDTH, CONTAINER_HEIGHT, FROM, UNTIL);

      expect(params).toEqual({
        range: { originalFromMinutes: 480, originalUntilMinutes: 600, displayFromMinutes: 470, displayUntilMinutes: 610,
          totalMinutes: 140 },
        boxWidth: 170,
        marginLeftRight: 15,
      });
    });
  });

  describe('drawTimeRuler', () => {
    it('draws a quarter-hour grid with edge labels left to right', () => {
      service.drawTimeRuler(createContext('ruler'), 200, FROM, UNTIL, 0);

      expectLog('ruler-quarter-ltr');
    });

    it('mirrors the ticks and labels right to left with a ruler width override', () => {
      document.documentElement.dir = 'rtl';

      service.drawTimeRuler(createContext('ruler'), 200, FROM, UNTIL, 0, false, 55);

      expectLog('ruler-quarter-rtl');
    });

    it('skips the edge labels on request', () => {
      service.drawTimeRuler(createContext('ruler'), 200, FROM, UNTIL, 0, true);

      expectLog('ruler-quarter-skip-edges');
    });

    it('draws minute ticks and labels the half hour', () => {
      service.drawTimeRuler(createContext('ruler'), 8, OwnTime.forTime('08', '28'), OwnTime.forTime('08', '32'), 0);

      expectLog('ruler-minutes');
    });

    it('aligns multi-hour increments to the increment and draws ticks above the window', () => {
      service.drawTimeRuler(createContext('ruler'), 90, FROM, OwnTime.forTime('12', '00'));

      expectLog('ruler-two-hours');
    });

    it('draws no ticks when the default padding is off the quarter-hour grid', () => {
      service.drawTimeRuler(createContext('ruler'), 260, FROM, UNTIL);

      expectLog('ruler-misaligned');
    });
  });

  describe('boundary lines', () => {
    it('draws the red window boundaries with fading gradients', () => {
      service.drawRedBoundaryLines(createContext('inbox'), BOUNDARY_WIDTH, CONTAINER_HEIGHT, FROM, UNTIL);

      expectLog('red-boundaries');
    });

    it('converts a color through a 1x1 canvas and falls back to black without a context', () => {
      expect(service.convertColorToRgba('#123456', 0.5)).toBe('rgba(12, 34, 56, 0.5)');

      nullContexts = true;

      expect(service.convertColorToRgba('#123456', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
      expectLog('rgba-conversion');
    });
  });

  describe('drawSingleShiftBox', () => {
    const drawBox = (item: IContainerTemplateItem, isSelected: boolean, shifts: IContainerTemplateItem[],
      map: Map<IContainerTemplateItem, Rectangle>): Rectangle | null => {
      const { range, boxWidth, marginLeftRight } =
        service.calculateShiftBoxParameters(BOUNDARY_WIDTH, CONTAINER_HEIGHT, FROM, UNTIL);
      return service.drawSingleShiftBox(createContext('inbox'), item, range, boxWidth, marginLeftRight, CONTAINER_HEIGHT,
        isSelected, shifts, map);
    };

    it('skips items without times or with unparseable times', () => {
      const map = new Map<IContainerTemplateItem, Rectangle>();
      const noTimes = shiftItem('', '', { isTimeRange: false }, { startItem: undefined, endItem: undefined });
      const broken = shiftItem('xx', '09:00');

      expect(drawBox(noTimes, false, [noTimes], map)).toBeNull();
      expect(drawBox(broken, false, [broken], map)).toBeNull();
      expect(map.size).toBe(0);
      expect(log).toEqual([]);
    });

    it('draws travel, briefing, body, debriefing and travel back and registers the body', () => {
      const map = new Map<IContainerTemplateItem, Rectangle>();
      const item = shiftItem('08:30', '09:00', {}, {
        travelTimeBefore: '00:15', briefingTime: '00:10', debriefingTime: '00:05', travelTimeAfter: '00:10',
      });

      const rect = drawBox(item, false, [item], map);

      log.push(`returned ${fmt(rect)}`);
      recordRectangles(map, { item });
      expectLog('box-full');
    });

    it('highlights a selected time range with its shift window and does not register it', () => {
      const map = new Map<IContainerTemplateItem, Rectangle>();
      const item = shiftItem('08:30', '09:00');

      const rect = drawBox(item, true, [item], map);

      log.push(`returned ${fmt(rect)}`);
      recordRectangles(map, { item });
      expectLog('box-selected');
    });

    it('paints a task that starts inside an earlier time range in the warning color', () => {
      const map = new Map<IContainerTemplateItem, Rectangle>();
      const earlier = shiftItem('08:15', '08:45', { name: 'Earlier' });
      const task = shiftItem('08:30', '09:00', { shiftType: 0, abbreviation: '', name: 'Task' });

      drawBox(task, false, [earlier, task], map);
      drawBox(earlier, false, [earlier, task], map);

      recordRectangles(map, { earlier, task });
      expectLog('box-task-overlap');
    });

    it('uses the absence color and the localized absence labels', () => {
      const map = new Map<IContainerTemplateItem, Rectangle>();
      const absence: IContainerTemplateItem = {
        shiftId: undefined,
        absenceId: 'absence-1',
        absence: {
          color: '#ff8800',
          abbreviation: { de: 'FE', en: 'HO' },
          name: { de: 'Ferien', en: 'Holiday' },
        } as unknown as IAbsence,
        startItem: '09:00',
        endItem: '09:30',
        timeRangeStartItem: null,
        timeRangeEndItem: null,
        briefingTime: '',
        debriefingTime: '',
        travelTimeBefore: '',
        travelTimeAfter: '',
      };

      drawBox(absence, false, [absence], map);

      recordRectangles(map, { absence });
      expectLog('box-absence');
    });

    it('draws a fixed shift and labels it by name when the abbreviation is missing', () => {
      const map = new Map<IContainerTemplateItem, Rectangle>();
      const fixed = shiftItem('08:00', '09:00', { isTimeRange: false, abbreviation: undefined, name: 'Duty' },
        { timeRangeStartItem: null, timeRangeEndItem: null });

      drawBox(fixed, true, [fixed], map);

      recordRectangles(map, { fixed });
      expectLog('box-fixed');
    });
  });

  describe('drawBlockSelectionRect', () => {
    it('draws nothing without bounds', () => {
      service.drawBlockSelectionRect(createContext('inbox'), null);

      expect(log).toEqual([]);
    });

    it('fills and outlines the block bounds', () => {
      service.drawBlockSelectionRect(createContext('inbox'), new Rectangle(13, 40, 187, 300));

      expectLog('block-rect');
    });
  });

  describe('cache and redraw', () => {
    let a: IContainerTemplateItem;
    let b: IContainerTemplateItem;
    let c: IContainerTemplateItem;
    let scene: IShiftSceneContext;

    beforeEach(() => {
      a = shiftItem('08:00', '08:30', { name: 'A' });
      b = shiftItem('08:30', '09:15', { name: 'B' });
      c = shiftItem('09:15', '09:45', { name: 'C' });
      scene = { shifts: [a, b, c], shiftRectangles: new Map(), fromTime: FROM, untilTime: UNTIL };
    });

    it('leaves the rectangles untouched when there are no shifts', () => {
      const stale = new Rectangle(1, 2, 3, 4);
      scene.shiftRectangles.set(a, stale);

      service.renderShiftsToCache(createContext('render'), BOUNDARY_WIDTH, CONTAINER_HEIGHT, { ...scene, shifts: [] });

      expect(log).toEqual([]);
      expect(scene.shiftRectangles.get(a)).toBe(stale);
    });

    it('renders background, window boundaries and all shifts into the cache', () => {
      scene.shiftRectangles.set(shiftItem('07:00', '08:00'), new Rectangle(1, 2, 3, 4));

      service.renderShiftsToCache(createContext('render'), BOUNDARY_WIDTH, CONTAINER_HEIGHT, scene);

      expect(scene.shiftRectangles.size).toBe(3);
      recordRectangles(scene.shiftRectangles, { a, b, c });
      expectLog('cache-render');
    });

    it('copies the cache onto the inbox canvas at the content offset', () => {
      const inbox = createHostedCanvas('inbox');
      const render = createRenderCanvas();

      service.drawFromCache(createContext('inbox'), render, document.createElement('canvas'));
      service.drawFromCache(createContext('inbox'), render, inbox);
      document.documentElement.dir = 'rtl';
      service.drawFromCache(createContext('inbox'), render, inbox);

      expectLog('from-cache');
    });

    it('redraws the selected shift on top of the cache', () => {
      const inbox = createHostedCanvas('inbox');

      service.redrawWithSelection(document.createElement('canvas'), createRenderCanvas(), b, scene);
      service.redrawWithSelection(inbox, createRenderCanvas(), b, scene);

      recordRectangles(scene.shiftRectangles, { a, b, c });
      expectLog('redraw-selection');
    });

    it('redraws the block members and the block outline without the single highlight', () => {
      const inbox = createHostedCanvas('inbox');
      const blockSelection = TestBed.inject(TimeRulerBlockSelectionService);
      blockSelection.selectedItems.set(new Set([a, b]));
      document.documentElement.dir = 'rtl';

      service.redrawWithSelection(inbox, createRenderCanvas(), b, scene, blockSelection);

      recordRectangles(scene.shiftRectangles, { a, b, c });
      expectLog('redraw-block');
    });

    it('redraws all other shifts into the cache and the dragged shift on top', () => {
      const inbox = createHostedCanvas('inbox');
      const render = createRenderCanvas();
      const renderCtx = createContext('renderCtx', render);

      service.redrawCanvas(document.createElement('canvas'), render, renderCtx, b, scene);
      service.redrawCanvas(inbox, render, renderCtx, b, scene);

      recordRectangles(scene.shiftRectangles, { a, b, c });
      expectLog('redraw-drag');
    });
  });

  describe('overlap and duration helpers', () => {
    it('flags only time ranges or absences that start inside another one', () => {
      const earlier = shiftItem('08:00', '09:00');
      const later = shiftItem('08:30', '09:30');
      const fixed = shiftItem('08:30', '09:30', { isTimeRange: false });

      expect(service.checkTaskOverlap(later, 510, 570, [earlier, later])).toBe(true);
      expect(service.checkTaskOverlap(earlier, 480, 540, [earlier, later])).toBe(false);
      expect(service.checkTaskOverlap(fixed, 510, 570, [earlier, fixed])).toBe(false);
      expect(service.checkTaskOverlap(later, 540, 570, [earlier, later])).toBe(false);
    });

    it('treats touching ranges as not overlapping', () => {
      expect(service.timesOverlap(480, 540, 540, 600)).toBe(false);
      expect(service.timesOverlap(480, 541, 540, 600)).toBe(true);
    });

    it('parses hh:mm travel times and ignores everything else', () => {
      expect(service.parseTravelTimeToMinutes('')).toBe(0);
      expect(service.parseTravelTimeToMinutes('01:30')).toBe(90);
      expect(service.parseTravelTimeToMinutes('00:45:00')).toBe(45);
      expect(service.parseTravelTimeToMinutes('5')).toBe(0);
      expect(service.parseTravelTimeToMinutes('x:y')).toBe(0);
    });
  });
});

const GOLDEN: Record<string, string[]> = {
  'ruler-quarter-ltr': [
    'ruler.strokeStyle=#101010',
    'ruler.fillStyle=#101010',
    'ruler.lineWidth=1',
    'ruler.font=10px Arial',
    'ruler.textAlign=left',
    'ruler.textBaseline=middle',
    'ruler.beginPath()',
    'ruler.moveTo(0, 0)',
    'ruler.lineTo(25, 0)',
    'ruler.stroke()',
    'ruler.textBaseline=top',
    'ruler.fillText(08:00, 28, 0)',
    'ruler.textBaseline=middle',
    'ruler.beginPath()',
    'ruler.moveTo(0, 25)',
    'ruler.lineTo(12, 25)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 50)',
    'ruler.lineTo(18, 50)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 75)',
    'ruler.lineTo(12, 75)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 100)',
    'ruler.lineTo(25, 100)',
    'ruler.stroke()',
    'ruler.fillText(09:00, 28, 100)',
    'ruler.textBaseline=middle',
    'ruler.beginPath()',
    'ruler.moveTo(0, 125)',
    'ruler.lineTo(12, 125)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 150)',
    'ruler.lineTo(18, 150)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 175)',
    'ruler.lineTo(12, 175)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 200)',
    'ruler.lineTo(25, 200)',
    'ruler.stroke()',
    'ruler.textBaseline=bottom',
    'ruler.fillText(10:00, 28, 200)',
    'ruler.textBaseline=middle',
  ],
  'ruler-quarter-rtl': [
    'ruler.strokeStyle=#101010',
    'ruler.fillStyle=#101010',
    'ruler.lineWidth=1',
    'ruler.font=10px Arial',
    'ruler.textAlign=right',
    'ruler.textBaseline=middle',
    'ruler.beginPath()',
    'ruler.moveTo(55, 0)',
    'ruler.lineTo(30, 0)',
    'ruler.stroke()',
    'ruler.textBaseline=top',
    'ruler.fillText(08:00, 27, 0)',
    'ruler.textBaseline=middle',
    'ruler.beginPath()',
    'ruler.moveTo(55, 25)',
    'ruler.lineTo(43, 25)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(55, 50)',
    'ruler.lineTo(37, 50)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(55, 75)',
    'ruler.lineTo(43, 75)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(55, 100)',
    'ruler.lineTo(30, 100)',
    'ruler.stroke()',
    'ruler.fillText(09:00, 27, 100)',
    'ruler.textBaseline=middle',
    'ruler.beginPath()',
    'ruler.moveTo(55, 125)',
    'ruler.lineTo(43, 125)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(55, 150)',
    'ruler.lineTo(37, 150)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(55, 175)',
    'ruler.lineTo(43, 175)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(55, 200)',
    'ruler.lineTo(30, 200)',
    'ruler.stroke()',
    'ruler.textBaseline=bottom',
    'ruler.fillText(10:00, 27, 200)',
    'ruler.textBaseline=middle',
  ],
  'ruler-quarter-skip-edges': [
    'ruler.strokeStyle=#101010',
    'ruler.fillStyle=#101010',
    'ruler.lineWidth=1',
    'ruler.font=10px Arial',
    'ruler.textAlign=left',
    'ruler.textBaseline=middle',
    'ruler.beginPath()',
    'ruler.moveTo(0, 0)',
    'ruler.lineTo(25, 0)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 25)',
    'ruler.lineTo(12, 25)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 50)',
    'ruler.lineTo(18, 50)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 75)',
    'ruler.lineTo(12, 75)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 100)',
    'ruler.lineTo(25, 100)',
    'ruler.stroke()',
    'ruler.fillText(09:00, 28, 100)',
    'ruler.textBaseline=middle',
    'ruler.beginPath()',
    'ruler.moveTo(0, 125)',
    'ruler.lineTo(12, 125)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 150)',
    'ruler.lineTo(18, 150)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 175)',
    'ruler.lineTo(12, 175)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 200)',
    'ruler.lineTo(25, 200)',
    'ruler.stroke()',
  ],
  'ruler-minutes': [
    'ruler.strokeStyle=#101010',
    'ruler.fillStyle=#101010',
    'ruler.lineWidth=1',
    'ruler.font=10px Arial',
    'ruler.textAlign=left',
    'ruler.textBaseline=middle',
    'ruler.beginPath()',
    'ruler.moveTo(0, 0)',
    'ruler.lineTo(6, 0)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 2)',
    'ruler.lineTo(6, 2)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 4)',
    'ruler.lineTo(18, 4)',
    'ruler.stroke()',
    'ruler.fillText(08:30, 21, 4)',
    'ruler.textBaseline=middle',
    'ruler.beginPath()',
    'ruler.moveTo(0, 6)',
    'ruler.lineTo(6, 6)',
    'ruler.stroke()',
    'ruler.beginPath()',
    'ruler.moveTo(0, 8)',
    'ruler.lineTo(6, 8)',
    'ruler.stroke()',
  ],
  'ruler-two-hours': [
    'ruler.strokeStyle=#101010',
    'ruler.fillStyle=#101010',
    'ruler.lineWidth=1',
    'ruler.font=10px Arial',
    'ruler.textAlign=left',
    'ruler.textBaseline=middle',
    'ruler.beginPath()',
    'ruler.moveTo(0, -35)',
    'ruler.lineTo(25, -35)',
    'ruler.stroke()',
    'ruler.textBaseline=top',
    'ruler.fillText(06:00, 28, -35)',
    'ruler.textBaseline=middle',
    'ruler.beginPath()',
    'ruler.moveTo(0, 5)',
    'ruler.lineTo(25, 5)',
    'ruler.stroke()',
    'ruler.fillText(08:00, 28, 5)',
    'ruler.textBaseline=middle',
    'ruler.beginPath()',
    'ruler.moveTo(0, 45)',
    'ruler.lineTo(25, 45)',
    'ruler.stroke()',
    'ruler.fillText(10:00, 28, 45)',
    'ruler.textBaseline=middle',
    'ruler.beginPath()',
    'ruler.moveTo(0, 85)',
    'ruler.lineTo(25, 85)',
    'ruler.stroke()',
    'ruler.fillText(12:00, 28, 85)',
    'ruler.textBaseline=middle',
  ],
  'ruler-misaligned': [
    'ruler.strokeStyle=#101010',
    'ruler.fillStyle=#101010',
    'ruler.lineWidth=1',
    'ruler.font=10px Arial',
    'ruler.textAlign=left',
    'ruler.textBaseline=middle',
  ],
  'red-boundaries': [
    'inbox.strokeStyle=#ee0000',
    'inbox.lineWidth=2',
    'inbox.beginPath()',
    'inbox.moveTo(0, 51.429)',
    'inbox.lineTo(200, 51.429)',
    'inbox.stroke()',
    'canvas1.getContext',
    'canvas1.fillStyle=#ee0000',
    'canvas1.fillRect(0, 0, 1, 1)',
    'canvas1.getImageData(0, 0, 1, 1)',
    'canvas2.getContext',
    'canvas2.fillStyle=#ee0000',
    'canvas2.fillRect(0, 0, 1, 1)',
    'canvas2.getImageData(0, 0, 1, 1)',
    'inbox.createLinearGradient(0, 51.429, 0, 63.429)',
    'gradient1.addColorStop(0, rgba(12, 34, 56, 0.2))',
    'gradient1.addColorStop(1, rgba(12, 34, 56, 0))',
    'inbox.fillStyle=gradient1',
    'inbox.fillRect(0, 51.429, 200, 12)',
    'inbox.strokeStyle=#ee0000',
    'inbox.lineWidth=2',
    'inbox.beginPath()',
    'inbox.moveTo(0, 668.571)',
    'inbox.lineTo(200, 668.571)',
    'inbox.stroke()',
    'canvas3.getContext',
    'canvas3.fillStyle=#ee0000',
    'canvas3.fillRect(0, 0, 1, 1)',
    'canvas3.getImageData(0, 0, 1, 1)',
    'canvas4.getContext',
    'canvas4.fillStyle=#ee0000',
    'canvas4.fillRect(0, 0, 1, 1)',
    'canvas4.getImageData(0, 0, 1, 1)',
    'inbox.createLinearGradient(0, 656.571, 0, 668.571)',
    'gradient2.addColorStop(0, rgba(12, 34, 56, 0))',
    'gradient2.addColorStop(1, rgba(12, 34, 56, 0.2))',
    'inbox.fillStyle=gradient2',
    'inbox.fillRect(0, 656.571, 200, 12)',
  ],
  'rgba-conversion': [
    'canvas1.getContext',
    'canvas1.fillStyle=#123456',
    'canvas1.fillRect(0, 0, 1, 1)',
    'canvas1.getImageData(0, 0, 1, 1)',
  ],
  'block-rect': [
    'canvas1.getContext',
    'canvas1.fillStyle=#1e90ff',
    'canvas1.fillRect(0, 0, 1, 1)',
    'canvas1.getImageData(0, 0, 1, 1)',
    'inbox.fillStyle=rgba(12, 34, 56, 0.15)',
    'inbox.fillRect(13, 40, 174, 260)',
    'inbox.strokeStyle=#1e90ff',
    'inbox.lineWidth=2',
    'inbox.strokeRect(13, 40, 174, 260)',
  ],
  'from-cache': [
    'inbox.drawImage(render, 0, 0, 400, 1440, 0, 0, 200, 720)',
    'inbox.drawImage(render, 0, 0, 400, 1440, 70, 0, 200, 720)',
  ],
  'box-full': [
    'inbox fillRectangle(#F5F5DC, R(15,77.143,185,154.286))',
    'inbox drawBaseBorder(#abad94, 1, R(15,77.143,185,154.286))',
    'inbox fillRectangle(rgb(149, 185, 208), R(15,154.286,185,205.714))',
    'inbox drawBaseBorder(#abad94, 1, R(15,154.286,185,205.714))',
    'inbox fillRectangle(#d5dbdb, R(15,205.714,185,360))',
    'inbox drawBorder(15, 205.714, 170, 360, #d5dbdb, 4, 1)',
    'inbox drawText(FR - Early, 15, 205.714, 170, 154.286, 12px Arial, 12, #101010, 2, 2)',
    'inbox fillRectangle(rgb(149, 185, 208), R(15,360,185,385.714))',
    'inbox drawBaseBorder(#abad94, 1, R(15,360,185,385.714))',
    'inbox fillRectangle(#F5F5DC, R(15,385.714,185,437.143))',
    'inbox drawBaseBorder(#abad94, 1, R(15,385.714,185,437.143))',
    'returned R(15,205.714,185,360)',
    'rectangles item=R(15,205.714,185,360)',
  ],
  'box-selected': [
    'inbox fillRectangle(#d5dbdb, R(15,205.714,185,360))',
    'inbox.save()',
    'inbox.globalAlpha=0.2',
    'inbox fillRectangle(#1e90ff, R(15,205.714,185,360))',
    'inbox.restore()',
    'inbox drawBorder(15, 205.714, 170, 360, #d5dbdb, 4, 1)',
    'inbox.strokeStyle=#1e90ff',
    'inbox.lineWidth=2',
    'inbox.beginPath()',
    'inbox.moveTo(0, -25.714)',
    'inbox.lineTo(200, -25.714)',
    'inbox.stroke()',
    'canvas1.getContext',
    'canvas1.fillStyle=#1e90ff',
    'canvas1.fillRect(0, 0, 1, 1)',
    'canvas1.getImageData(0, 0, 1, 1)',
    'canvas2.getContext',
    'canvas2.fillStyle=#1e90ff',
    'canvas2.fillRect(0, 0, 1, 1)',
    'canvas2.getImageData(0, 0, 1, 1)',
    'inbox.createLinearGradient(0, -25.714, 0, -13.714)',
    'gradient1.addColorStop(0, rgba(12, 34, 56, 0.2))',
    'gradient1.addColorStop(1, rgba(12, 34, 56, 0))',
    'inbox.fillStyle=gradient1',
    'inbox.fillRect(0, -25.714, 200, 12)',
    'inbox.strokeStyle=#1e90ff',
    'inbox.lineWidth=2',
    'inbox.beginPath()',
    'inbox.moveTo(0, 437.143)',
    'inbox.lineTo(200, 437.143)',
    'inbox.stroke()',
    'canvas3.getContext',
    'canvas3.fillStyle=#1e90ff',
    'canvas3.fillRect(0, 0, 1, 1)',
    'canvas3.getImageData(0, 0, 1, 1)',
    'canvas4.getContext',
    'canvas4.fillStyle=#1e90ff',
    'canvas4.fillRect(0, 0, 1, 1)',
    'canvas4.getImageData(0, 0, 1, 1)',
    'inbox.createLinearGradient(0, 425.143, 0, 437.143)',
    'gradient2.addColorStop(0, rgba(12, 34, 56, 0))',
    'gradient2.addColorStop(1, rgba(12, 34, 56, 0.2))',
    'inbox.fillStyle=gradient2',
    'inbox.fillRect(0, 425.143, 200, 12)',
    'inbox drawText(FR - Early, 15, 205.714, 170, 154.286, 12px Arial, 12, #101010, 2, 2)',
    'returned R(15,205.714,185,360)',
    'rectangles item=-',
  ],
  'box-task-overlap': [
    'inbox fillRectangle(#ee0000, R(15,205.714,185,360))',
    'inbox drawBorder(15, 205.714, 170, 360, #cdcdd8, 4, 1)',
    'inbox drawText(Task, 15, 205.714, 170, 154.286, 12px Arial, 12, #101010, 2, 2)',
    'inbox fillRectangle(#d5dbdb, R(15,128.571,185,282.857))',
    'inbox drawBorder(15, 128.571, 170, 282.857, #d5dbdb, 4, 1)',
    'inbox drawText(FR - Earlier, 15, 128.571, 170, 154.286, 12px Arial, 12, #101010, 2, 2)',
    'rectangles earlier=R(15,128.571,185,282.857) task=R(15,205.714,185,360)',
  ],
  'box-absence': [
    'inbox fillRectangle(#ff8800, R(15,360,185,514.286))',
    'inbox drawBorder(15, 360, 170, 514.286, #ff8800, 4, 1)',
    'inbox drawText(FE - Ferien, 15, 360, 170, 154.286, 12px Arial, 12, #101010, 2, 2)',
    'rectangles absence=R(15,360,185,514.286)',
  ],
  'box-fixed': [
    'inbox fillRectangle(#d5dbdb, R(15,51.429,185,360))',
    'inbox.save()',
    'inbox.globalAlpha=0.2',
    'inbox fillRectangle(#1e90ff, R(15,51.429,185,360))',
    'inbox.restore()',
    'inbox drawBorder(15, 51.429, 170, 360, #d5dbdb, 4, 1)',
    'inbox drawText(Duty, 15, 51.429, 170, 308.571, 12px Arial, 12, #101010, 2, 2)',
    'rectangles fixed=-',
  ],
  'cache-render': [
    'render.fillStyle=#f2eded',
    'render.fillRect(0, 0, 200, 720)',
    'render.strokeStyle=#ee0000',
    'render.lineWidth=2',
    'render.beginPath()',
    'render.moveTo(0, 51.429)',
    'render.lineTo(200, 51.429)',
    'render.stroke()',
    'canvas1.getContext',
    'canvas1.fillStyle=#ee0000',
    'canvas1.fillRect(0, 0, 1, 1)',
    'canvas1.getImageData(0, 0, 1, 1)',
    'canvas2.getContext',
    'canvas2.fillStyle=#ee0000',
    'canvas2.fillRect(0, 0, 1, 1)',
    'canvas2.getImageData(0, 0, 1, 1)',
    'render.createLinearGradient(0, 51.429, 0, 63.429)',
    'gradient1.addColorStop(0, rgba(12, 34, 56, 0.2))',
    'gradient1.addColorStop(1, rgba(12, 34, 56, 0))',
    'render.fillStyle=gradient1',
    'render.fillRect(0, 51.429, 200, 12)',
    'render.strokeStyle=#ee0000',
    'render.lineWidth=2',
    'render.beginPath()',
    'render.moveTo(0, 668.571)',
    'render.lineTo(200, 668.571)',
    'render.stroke()',
    'canvas3.getContext',
    'canvas3.fillStyle=#ee0000',
    'canvas3.fillRect(0, 0, 1, 1)',
    'canvas3.getImageData(0, 0, 1, 1)',
    'canvas4.getContext',
    'canvas4.fillStyle=#ee0000',
    'canvas4.fillRect(0, 0, 1, 1)',
    'canvas4.getImageData(0, 0, 1, 1)',
    'render.createLinearGradient(0, 656.571, 0, 668.571)',
    'gradient2.addColorStop(0, rgba(12, 34, 56, 0))',
    'gradient2.addColorStop(1, rgba(12, 34, 56, 0.2))',
    'render.fillStyle=gradient2',
    'render.fillRect(0, 656.571, 200, 12)',
    'render fillRectangle(#d5dbdb, R(15,51.429,185,205.714))',
    'render drawBorder(15, 51.429, 170, 205.714, #d5dbdb, 4, 1)',
    'render drawText(FR - A, 15, 51.429, 170, 154.286, 12px Arial, 12, #101010, 2, 2)',
    'render fillRectangle(#d5dbdb, R(15,205.714,185,437.143))',
    'render drawBorder(15, 205.714, 170, 437.143, #d5dbdb, 4, 1)',
    'render drawText(FR - B, 15, 205.714, 170, 231.429, 12px Arial, 12, #101010, 2, 2)',
    'render fillRectangle(#d5dbdb, R(15,437.143,185,591.429))',
    'render drawBorder(15, 437.143, 170, 591.429, #d5dbdb, 4, 1)',
    'render drawText(FR - C, 15, 437.143, 170, 154.286, 12px Arial, 12, #101010, 2, 2)',
    'rectangles a=R(15,51.429,185,205.714) b=R(15,205.714,185,437.143) c=R(15,437.143,185,591.429)',
  ],
  'redraw-selection': [
    'inbox.getContext',
    'inbox.clearRect(0, 0, 200, 720)',
    'inbox.drawImage(render, 0, 0, 400, 1440, 0, 0, 200, 720)',
    'inbox.save()',
    'inbox.translate(0, 0)',
    'inbox fillRectangle(#d5dbdb, R(15,205.714,185,437.143))',
    'inbox.save()',
    'inbox.globalAlpha=0.2',
    'inbox fillRectangle(#1e90ff, R(15,205.714,185,437.143))',
    'inbox.restore()',
    'inbox drawBorder(15, 205.714, 170, 437.143, #d5dbdb, 4, 1)',
    'inbox.strokeStyle=#1e90ff',
    'inbox.lineWidth=2',
    'inbox.beginPath()',
    'inbox.moveTo(0, -25.714)',
    'inbox.lineTo(200, -25.714)',
    'inbox.stroke()',
    'canvas1.getContext',
    'canvas1.fillStyle=#1e90ff',
    'canvas1.fillRect(0, 0, 1, 1)',
    'canvas1.getImageData(0, 0, 1, 1)',
    'canvas2.getContext',
    'canvas2.fillStyle=#1e90ff',
    'canvas2.fillRect(0, 0, 1, 1)',
    'canvas2.getImageData(0, 0, 1, 1)',
    'inbox.createLinearGradient(0, -25.714, 0, -13.714)',
    'gradient1.addColorStop(0, rgba(12, 34, 56, 0.2))',
    'gradient1.addColorStop(1, rgba(12, 34, 56, 0))',
    'inbox.fillStyle=gradient1',
    'inbox.fillRect(0, -25.714, 200, 12)',
    'inbox.strokeStyle=#1e90ff',
    'inbox.lineWidth=2',
    'inbox.beginPath()',
    'inbox.moveTo(0, 437.143)',
    'inbox.lineTo(200, 437.143)',
    'inbox.stroke()',
    'canvas3.getContext',
    'canvas3.fillStyle=#1e90ff',
    'canvas3.fillRect(0, 0, 1, 1)',
    'canvas3.getImageData(0, 0, 1, 1)',
    'canvas4.getContext',
    'canvas4.fillStyle=#1e90ff',
    'canvas4.fillRect(0, 0, 1, 1)',
    'canvas4.getImageData(0, 0, 1, 1)',
    'inbox.createLinearGradient(0, 425.143, 0, 437.143)',
    'gradient2.addColorStop(0, rgba(12, 34, 56, 0))',
    'gradient2.addColorStop(1, rgba(12, 34, 56, 0.2))',
    'inbox.fillStyle=gradient2',
    'inbox.fillRect(0, 425.143, 200, 12)',
    'inbox drawText(FR - B, 15, 205.714, 170, 231.429, 12px Arial, 12, #101010, 2, 2)',
    'inbox.restore()',
    'inbox.fillStyle=rgba(30, 144, 255, 0.12)',
    'inbox.fillRect(15, 205.714, 170, 231.429)',
    'inbox.save()',
    'inbox.setLineDash([4,3])',
    'inbox.strokeStyle=#1e90ff',
    'inbox.lineWidth=1.5',
    'inbox.strokeRect(15, 205.714, 170, 231.429)',
    'inbox.restore()',
    'rectangles a=- b=R(15,205.714,185,437.143) c=-',
  ],
  'redraw-block': [
    'inbox.getContext',
    'inbox.clearRect(70, 0, 200, 720)',
    'inbox.drawImage(render, 0, 0, 400, 1440, 70, 0, 200, 720)',
    'inbox.save()',
    'inbox.translate(70, 0)',
    'inbox fillRectangle(#d5dbdb, R(15,205.714,185,437.143))',
    'inbox.save()',
    'inbox.globalAlpha=0.2',
    'inbox fillRectangle(#1e90ff, R(15,205.714,185,437.143))',
    'inbox.restore()',
    'inbox drawBorder(15, 205.714, 170, 437.143, #d5dbdb, 4, 1)',
    'inbox.strokeStyle=#1e90ff',
    'inbox.lineWidth=2',
    'inbox.beginPath()',
    'inbox.moveTo(0, -25.714)',
    'inbox.lineTo(200, -25.714)',
    'inbox.stroke()',
    'canvas1.getContext',
    'canvas1.fillStyle=#1e90ff',
    'canvas1.fillRect(0, 0, 1, 1)',
    'canvas1.getImageData(0, 0, 1, 1)',
    'canvas2.getContext',
    'canvas2.fillStyle=#1e90ff',
    'canvas2.fillRect(0, 0, 1, 1)',
    'canvas2.getImageData(0, 0, 1, 1)',
    'inbox.createLinearGradient(0, -25.714, 0, -13.714)',
    'gradient1.addColorStop(0, rgba(12, 34, 56, 0.2))',
    'gradient1.addColorStop(1, rgba(12, 34, 56, 0))',
    'inbox.fillStyle=gradient1',
    'inbox.fillRect(0, -25.714, 200, 12)',
    'inbox.strokeStyle=#1e90ff',
    'inbox.lineWidth=2',
    'inbox.beginPath()',
    'inbox.moveTo(0, 437.143)',
    'inbox.lineTo(200, 437.143)',
    'inbox.stroke()',
    'canvas3.getContext',
    'canvas3.fillStyle=#1e90ff',
    'canvas3.fillRect(0, 0, 1, 1)',
    'canvas3.getImageData(0, 0, 1, 1)',
    'canvas4.getContext',
    'canvas4.fillStyle=#1e90ff',
    'canvas4.fillRect(0, 0, 1, 1)',
    'canvas4.getImageData(0, 0, 1, 1)',
    'inbox.createLinearGradient(0, 425.143, 0, 437.143)',
    'gradient2.addColorStop(0, rgba(12, 34, 56, 0))',
    'gradient2.addColorStop(1, rgba(12, 34, 56, 0.2))',
    'inbox.fillStyle=gradient2',
    'inbox.fillRect(0, 425.143, 200, 12)',
    'inbox drawText(FR - B, 15, 205.714, 170, 231.429, 12px Arial, 12, #101010, 2, 2)',
    'inbox.restore()',
    'inbox.save()',
    'inbox.translate(70, 0)',
    'inbox fillRectangle(#d5dbdb, R(15,51.429,185,205.714))',
    'inbox.save()',
    'inbox.globalAlpha=0.2',
    'inbox fillRectangle(#1e90ff, R(15,51.429,185,205.714))',
    'inbox.restore()',
    'inbox drawBorder(15, 51.429, 170, 205.714, #d5dbdb, 4, 1)',
    'inbox.strokeStyle=#1e90ff',
    'inbox.lineWidth=2',
    'inbox.beginPath()',
    'inbox.moveTo(0, -25.714)',
    'inbox.lineTo(200, -25.714)',
    'inbox.stroke()',
    'canvas5.getContext',
    'canvas5.fillStyle=#1e90ff',
    'canvas5.fillRect(0, 0, 1, 1)',
    'canvas5.getImageData(0, 0, 1, 1)',
    'canvas6.getContext',
    'canvas6.fillStyle=#1e90ff',
    'canvas6.fillRect(0, 0, 1, 1)',
    'canvas6.getImageData(0, 0, 1, 1)',
    'inbox.createLinearGradient(0, -25.714, 0, -13.714)',
    'gradient3.addColorStop(0, rgba(12, 34, 56, 0.2))',
    'gradient3.addColorStop(1, rgba(12, 34, 56, 0))',
    'inbox.fillStyle=gradient3',
    'inbox.fillRect(0, -25.714, 200, 12)',
    'inbox.strokeStyle=#1e90ff',
    'inbox.lineWidth=2',
    'inbox.beginPath()',
    'inbox.moveTo(0, 437.143)',
    'inbox.lineTo(200, 437.143)',
    'inbox.stroke()',
    'canvas7.getContext',
    'canvas7.fillStyle=#1e90ff',
    'canvas7.fillRect(0, 0, 1, 1)',
    'canvas7.getImageData(0, 0, 1, 1)',
    'canvas8.getContext',
    'canvas8.fillStyle=#1e90ff',
    'canvas8.fillRect(0, 0, 1, 1)',
    'canvas8.getImageData(0, 0, 1, 1)',
    'inbox.createLinearGradient(0, 425.143, 0, 437.143)',
    'gradient4.addColorStop(0, rgba(12, 34, 56, 0))',
    'gradient4.addColorStop(1, rgba(12, 34, 56, 0.2))',
    'inbox.fillStyle=gradient4',
    'inbox.fillRect(0, 425.143, 200, 12)',
    'inbox drawText(FR - A, 15, 51.429, 170, 154.286, 12px Arial, 12, #101010, 2, 2)',
    'canvas9.getContext',
    'canvas9.fillStyle=#1e90ff',
    'canvas9.fillRect(0, 0, 1, 1)',
    'canvas9.getImageData(0, 0, 1, 1)',
    'inbox.fillStyle=rgba(12, 34, 56, 0.15)',
    'inbox.fillRect(13, 51.429, 174, 385.714)',
    'inbox.strokeStyle=#1e90ff',
    'inbox.lineWidth=2',
    'inbox.strokeRect(13, 51.429, 174, 385.714)',
    'inbox.restore()',
    'rectangles a=R(15,51.429,185,205.714) b=R(15,205.714,185,437.143) c=-',
  ],
  'redraw-drag': [
    'inbox.getContext',
    'inbox.clearRect(0, 0, 200, 720)',
    'inbox.drawImage(render, 0, 0, 400, 1440, 0, 0, 200, 720)',
    'inbox.clearRect(0, 0, 200, 720)',
    'canvas1.getContext',
    'canvas1.scale(2, 2)',
    'canvas1.imageSmoothingEnabled=true',
    'canvas1.webkitImageSmoothingEnabled=true',
    'canvas1.imageSmoothingQuality=high',
    'canvas1.drawImage(render, 0, 0, 400, 1440, 0, 0, 200, 720)',
    'renderCtx.clearRect(0, 0, 200, 720)',
    'renderCtx.fillStyle=#f2eded',
    'renderCtx.fillRect(0, 0, 200, 720)',
    'renderCtx.strokeStyle=#ee0000',
    'renderCtx.lineWidth=2',
    'renderCtx.beginPath()',
    'renderCtx.moveTo(0, 51.429)',
    'renderCtx.lineTo(200, 51.429)',
    'renderCtx.stroke()',
    'canvas2.getContext',
    'canvas2.fillStyle=#ee0000',
    'canvas2.fillRect(0, 0, 1, 1)',
    'canvas2.getImageData(0, 0, 1, 1)',
    'canvas3.getContext',
    'canvas3.fillStyle=#ee0000',
    'canvas3.fillRect(0, 0, 1, 1)',
    'canvas3.getImageData(0, 0, 1, 1)',
    'renderCtx.createLinearGradient(0, 51.429, 0, 63.429)',
    'gradient1.addColorStop(0, rgba(12, 34, 56, 0.2))',
    'gradient1.addColorStop(1, rgba(12, 34, 56, 0))',
    'renderCtx.fillStyle=gradient1',
    'renderCtx.fillRect(0, 51.429, 200, 12)',
    'renderCtx.strokeStyle=#ee0000',
    'renderCtx.lineWidth=2',
    'renderCtx.beginPath()',
    'renderCtx.moveTo(0, 668.571)',
    'renderCtx.lineTo(200, 668.571)',
    'renderCtx.stroke()',
    'canvas4.getContext',
    'canvas4.fillStyle=#ee0000',
    'canvas4.fillRect(0, 0, 1, 1)',
    'canvas4.getImageData(0, 0, 1, 1)',
    'canvas5.getContext',
    'canvas5.fillStyle=#ee0000',
    'canvas5.fillRect(0, 0, 1, 1)',
    'canvas5.getImageData(0, 0, 1, 1)',
    'renderCtx.createLinearGradient(0, 656.571, 0, 668.571)',
    'gradient2.addColorStop(0, rgba(12, 34, 56, 0))',
    'gradient2.addColorStop(1, rgba(12, 34, 56, 0.2))',
    'renderCtx.fillStyle=gradient2',
    'renderCtx.fillRect(0, 656.571, 200, 12)',
    'renderCtx fillRectangle(#d5dbdb, R(15,51.429,185,205.714))',
    'renderCtx drawBorder(15, 51.429, 170, 205.714, #d5dbdb, 4, 1)',
    'renderCtx drawText(FR - A, 15, 51.429, 170, 154.286, 12px Arial, 12, #101010, 2, 2)',
    'renderCtx fillRectangle(#d5dbdb, R(15,437.143,185,591.429))',
    'renderCtx drawBorder(15, 437.143, 170, 591.429, #d5dbdb, 4, 1)',
    'renderCtx drawText(FR - C, 15, 437.143, 170, 154.286, 12px Arial, 12, #101010, 2, 2)',
    'inbox.drawImage(render, 0, 0, 400, 1440, 0, 0, 200, 720)',
    'inbox.save()',
    'inbox.translate(0, 0)',
    'inbox fillRectangle(#d5dbdb, R(15,205.714,185,437.143))',
    'inbox.save()',
    'inbox.globalAlpha=0.2',
    'inbox fillRectangle(#1e90ff, R(15,205.714,185,437.143))',
    'inbox.restore()',
    'inbox drawBorder(15, 205.714, 170, 437.143, #d5dbdb, 4, 1)',
    'inbox.strokeStyle=#1e90ff',
    'inbox.lineWidth=2',
    'inbox.beginPath()',
    'inbox.moveTo(0, -25.714)',
    'inbox.lineTo(200, -25.714)',
    'inbox.stroke()',
    'canvas6.getContext',
    'canvas6.fillStyle=#1e90ff',
    'canvas6.fillRect(0, 0, 1, 1)',
    'canvas6.getImageData(0, 0, 1, 1)',
    'canvas7.getContext',
    'canvas7.fillStyle=#1e90ff',
    'canvas7.fillRect(0, 0, 1, 1)',
    'canvas7.getImageData(0, 0, 1, 1)',
    'inbox.createLinearGradient(0, -25.714, 0, -13.714)',
    'gradient3.addColorStop(0, rgba(12, 34, 56, 0.2))',
    'gradient3.addColorStop(1, rgba(12, 34, 56, 0))',
    'inbox.fillStyle=gradient3',
    'inbox.fillRect(0, -25.714, 200, 12)',
    'inbox.strokeStyle=#1e90ff',
    'inbox.lineWidth=2',
    'inbox.beginPath()',
    'inbox.moveTo(0, 437.143)',
    'inbox.lineTo(200, 437.143)',
    'inbox.stroke()',
    'canvas8.getContext',
    'canvas8.fillStyle=#1e90ff',
    'canvas8.fillRect(0, 0, 1, 1)',
    'canvas8.getImageData(0, 0, 1, 1)',
    'canvas9.getContext',
    'canvas9.fillStyle=#1e90ff',
    'canvas9.fillRect(0, 0, 1, 1)',
    'canvas9.getImageData(0, 0, 1, 1)',
    'inbox.createLinearGradient(0, 425.143, 0, 437.143)',
    'gradient4.addColorStop(0, rgba(12, 34, 56, 0))',
    'gradient4.addColorStop(1, rgba(12, 34, 56, 0.2))',
    'inbox.fillStyle=gradient4',
    'inbox.fillRect(0, 425.143, 200, 12)',
    'inbox drawText(FR - B, 15, 205.714, 170, 231.429, 12px Arial, 12, #101010, 2, 2)',
    'inbox.restore()',
    'renderCtx.clearRect(0, 0, 200, 720)',
    'renderCtx.drawImage(canvas1, 0, 0, 400, 1440, 0, 0, 200, 720)',
    'rectangles a=R(15,51.429,185,205.714) b=R(15,205.714,185,437.143) c=R(15,437.143,185,591.429)',
  ],
};
