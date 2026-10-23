// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Characterization tests for the floor plan canvas editing services, run against a real fabric canvas
 * whose 2D context is replaced by a no-op stub (jsdom has no canvas backend).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  ActiveSelection,
  Canvas,
  Circle,
  FabricObject,
  Gradient,
  Group,
  Line,
  Path,
  PencilBrush,
  Polygon,
  Polyline,
  Rect,
  Shadow,
  Textbox,
} from 'fabric';
import { FloorPlanCanvasService } from './floor-plan-canvas.service';
import { FloorPlanLayerService } from './floor-plan-layer.service';
import { FloorPlanToolService } from './floor-plan-tool.service';
import { FloorPlanAnchorSnapService } from './floor-plan-anchor-snap.service';
import { FabricWithData } from './fabric-with-data.type';
import { FloorPlanObjectData } from './floor-plan-object-data.interface';
import { ILiveMarkerEntry } from './live-marker-entry.interface';
import { IFloorPlanWorkMarker } from '../domain/models/floor-plan-work-marker.interface';
import { FloorPlanMarkerType } from '../domain/enums/floor-plan-marker-type.enum';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const STUB_DATA_URL = 'data:image/png;base64,STUB';

interface PathCommands { path: (string | number)[][] }
interface GradientView { type: string; coords: Record<string, number>; colorStops: { offset: number; color: string }[] }

function createContextStub(element: HTMLCanvasElement): CanvasRenderingContext2D {
  const store: Record<string | symbol, unknown> = {};
  const stub = new Proxy(store, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'symbol' || prop === 'then' || prop === 'toJSON') return undefined;
      switch (prop) {
        case 'canvas':
          return element;
        case 'measureText':
          return (text: string) => ({
            width: text.length * 6,
            actualBoundingBoxAscent: 8,
            actualBoundingBoxDescent: 2,
            fontBoundingBoxAscent: 8,
            fontBoundingBoxDescent: 2,
          });
        case 'getImageData':
        case 'createImageData':
          return (_x: number, _y: number, w = 1, h = 1) => ({
            data: new Uint8ClampedArray(Math.max(1, w * h) * 4),
            width: w,
            height: h,
          });
        case 'getLineDash':
          return () => [];
        case 'getTransform':
          return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
        case 'createLinearGradient':
        case 'createRadialGradient':
        case 'createConicGradient':
          return () => ({ addColorStop: () => undefined });
        case 'createPattern':
          return () => ({ setTransform: () => undefined });
        case 'isPointInPath':
        case 'isPointInStroke':
          return () => false;
        default:
          return () => undefined;
      }
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
  return stub as unknown as CanvasRenderingContext2D;
}

const anchorSnapMock = {
  findSnap: vi.fn(),
  showHighlight: vi.fn(),
  hideHighlight: vi.fn(),
};

const core = (): FloorPlanCanvasService => TestBed.inject(FloorPlanCanvasService);
const shapes = (): FloorPlanCanvasService => TestBed.inject(FloorPlanCanvasService);
const drawing = (): FloorPlanCanvasService => TestBed.inject(FloorPlanCanvasService);
const editing = (): FloorPlanCanvasService => TestBed.inject(FloorPlanCanvasService);
const styling = (): FloorPlanCanvasService => TestBed.inject(FloorPlanCanvasService);
const markers = (): FloorPlanCanvasService => TestBed.inject(FloorPlanCanvasService);
const layers = (): FloorPlanLayerService => TestBed.inject(FloorPlanLayerService);
const tools = (): FloorPlanToolService => TestBed.inject(FloorPlanToolService);

interface HistoryInternals { _undoStack: () => string[]; _redoStack: () => string[] }
const undoDepth = (): number => (core() as unknown as HistoryInternals)._undoStack().length;
const redoDepth = (): number => (core() as unknown as HistoryInternals)._redoStack().length;

const dataOf = (obj: FabricObject): FloorPlanObjectData | undefined => (obj as FabricWithData).data;
const commandsOf = (obj: FabricObject): (string | number)[][] => (obj as unknown as PathCommands).path;

function init(width = 800, height = 600): Canvas {
  const element = document.createElement('canvas');
  document.body.appendChild(element);
  core().initCanvas(element, width, height);
  return core().getCanvas()!;
}

function nextLoad(): Promise<void> {
  return new Promise((resolve) => core().registerAfterLoadCallback(() => resolve()));
}

function select(canvas: Canvas, ...objects: FabricObject[]): void {
  if (objects.length === 1) {
    canvas.setActiveObject(objects[0]);
    return;
  }
  canvas.setActiveObject(new ActiveSelection(objects, { canvas }));
}

function plainRect(left = 100, top = 100, width = 120, height = 80): Rect {
  return new Rect({ left, top, width, height, strokeWidth: 0 });
}

describe('FloorPlanCanvasService (characterization)', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return createContextStub(this);
    } as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(STUB_DATA_URL);
    anchorSnapMock.findSnap.mockReset().mockReturnValue(null);
    anchorSnapMock.showHighlight.mockReset();
    anchorSnapMock.hideHighlight.mockReset();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FloorPlanCanvasService,
        FloorPlanLayerService,
        FloorPlanToolService,
        { provide: FloorPlanAnchorSnapService, useValue: anchorSnapMock },
      ],
    });
    layers().initDefaultLayers();
  });

  afterEach(() => {
    core().disposeCanvas();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  describe('lifecycle', () => {
    it('reports not ready and returns neutral values before initCanvas', () => {
      expect(core().canvasReady()).toBe(false);
      expect(core().getCanvas()).toBeNull();
      expect(core().toJSON()).toBe('{}');
      expect(core().toSVG()).toBe('');
      expect(core().toDataURL()).toBe('');
      expect(core().canUndo()).toBe(false);
      expect(markers().extractWorkMarkers('fp')).toEqual([]);
      expect(() => shapes().addRect()).not.toThrow();
    });

    it('creates a white canvas with the given size and records the initial history state', () => {
      const canvas = init(640, 480);
      expect(core().canvasReady()).toBe(true);
      expect(canvas).toBeInstanceOf(Canvas);
      expect(canvas.getWidth()).toBe(640);
      expect(canvas.getHeight()).toBe(480);
      expect(canvas.backgroundColor).toBe('#ffffff');
      expect(undoDepth()).toBe(1);
      expect(core().canUndo()).toBe(true);
      expect(core().canRedo()).toBe(false);
    });

    it('disposes a previous canvas when initialised again', () => {
      const first = init();
      const disposeSpy = vi.spyOn(first, 'dispose');
      const second = init();
      expect(disposeSpy).toHaveBeenCalledTimes(1);
      expect(second).not.toBe(first);
      expect(undoDepth()).toBe(2);
    });

    it('clears canvas, ready flag and selection on dispose', () => {
      const canvas = init();
      const rect = plainRect();
      canvas.add(rect);
      canvas.fire('selection:created', { selected: [rect] } as never);
      expect(core().selectedObject()).toBe(rect);
      core().disposeCanvas();
      expect(core().getCanvas()).toBeNull();
      expect(core().canvasReady()).toBe(false);
      expect(core().selectedObject()).toBeNull();
    });
  });

  describe('selection events', () => {
    it('tracks the first selected object and clears it', () => {
      const canvas = init();
      const a = plainRect();
      const b = plainRect(300);
      canvas.fire('selection:created', { selected: [a, b] } as never);
      expect(core().selectedObject()).toBe(a);
      canvas.fire('selection:updated', { selected: [b] } as never);
      expect(core().selectedObject()).toBe(b);
      canvas.fire('selection:updated', { selected: [] } as never);
      expect(core().selectedObject()).toBeNull();
      canvas.fire('selection:created', { selected: [a] } as never);
      canvas.fire('selection:cleared', {} as never);
      expect(core().selectedObject()).toBeNull();
    });
  });

  describe('history', () => {
    it('records added, removed and modified objects', () => {
      const canvas = init();
      const rect = plainRect();
      canvas.add(rect);
      expect(undoDepth()).toBe(2);
      canvas.fire('object:modified', { target: rect } as never);
      expect(undoDepth()).toBe(3);
      expect(anchorSnapMock.hideHighlight).toHaveBeenCalledWith(canvas);
      canvas.remove(rect);
      expect(undoDepth()).toBe(4);
    });

    it('ignores helper objects for added and removed events', () => {
      const canvas = init();
      for (const flag of ['isPortIndicator', 'isConnector', 'isPointHandle', 'isPointStem']) {
        const helper = plainRect();
        helper.set('data', { [flag]: true });
        canvas.add(helper);
        canvas.remove(helper);
      }
      expect(undoDepth()).toBe(1);
    });

    it('ignores connectors and point editor helpers for modified events but still hides the highlight', () => {
      const canvas = init();
      for (const flag of ['isConnector', 'isPointHandle', 'isPointStem']) {
        const helper = plainRect();
        helper.set('data', { [flag]: true });
        canvas.fire('object:modified', { target: helper } as never);
      }
      expect(undoDepth()).toBe(1);
      expect(anchorSnapMock.hideHighlight).toHaveBeenCalledTimes(3);
      const portIndicator = plainRect();
      portIndicator.set('data', { isPortIndicator: true });
      canvas.fire('object:modified', { target: portIndicator } as never);
      expect(undoDepth()).toBe(2);
    });

    it('suppresses recording until ended, captureHistory records once and lifts suppression', () => {
      const canvas = init();
      core().beginSuppressHistory();
      canvas.add(plainRect());
      expect(undoDepth()).toBe(1);
      core().endSuppressHistory();
      canvas.add(plainRect());
      expect(undoDepth()).toBe(2);
      core().beginSuppressHistory();
      canvas.add(plainRect());
      core().captureHistory();
      expect(undoDepth()).toBe(3);
      canvas.add(plainRect());
      expect(undoDepth()).toBe(4);
    });

    it('keeps at most 50 states', () => {
      const canvas = init();
      for (let i = 0; i < 60; i++) {
        canvas.add(plainRect(i));
      }
      expect(undoDepth()).toBe(50);
    });

    it('does nothing on undo with only the initial state and on redo with an empty redo stack', () => {
      init();
      core().undo();
      core().redo();
      expect(undoDepth()).toBe(1);
      expect(redoDepth()).toBe(0);
    });

    it('undo and redo move states between the stacks and restore the canvas while history is suppressed', async () => {
      const canvas = init();
      shapes().addRect();
      const shapeId = dataOf(canvas.getObjects()[0])?.shapeId;
      expect(undoDepth()).toBe(2);

      core().beginSuppressHistory();
      let loaded = nextLoad();
      core().undo();
      expect(undoDepth()).toBe(1);
      expect(redoDepth()).toBe(1);
      expect(core().canRedo()).toBe(true);
      await loaded;
      expect(canvas.getObjects()).toHaveLength(0);

      loaded = nextLoad();
      core().redo();
      expect(undoDepth()).toBe(2);
      expect(redoDepth()).toBe(0);
      await loaded;
      expect(canvas.getObjects()).toHaveLength(1);
      expect(dataOf(canvas.getObjects()[0])?.shapeId).toBe(shapeId);
      core().endSuppressHistory();
    });

    it('undo without suppression records the removal caused by the reload and drops the redo state', async () => {
      const canvas = init();
      shapes().addRect();
      const loaded = nextLoad();
      core().undo();
      await loaded;
      expect(canvas.getObjects()).toHaveLength(0);
      expect(undoDepth()).toBe(2);
      expect(core().canRedo()).toBe(false);
    });

    it('a new recorded state clears the redo stack', async () => {
      const canvas = init();
      shapes().addRect();
      core().beginSuppressHistory();
      const loaded = nextLoad();
      core().undo();
      await loaded;
      core().endSuppressHistory();
      expect(redoDepth()).toBe(1);
      canvas.add(plainRect());
      expect(redoDepth()).toBe(0);
    });

    it('assigns missing shape ids to plain shapes after an undo reload', async () => {
      const canvas = init();
      core().beginSuppressHistory();
      const plain = plainRect();
      const connector = plainRect();
      connector.set('data', { isConnector: true });
      canvas.add(plain, connector);
      core().captureHistory();
      canvas.add(plainRect());
      expect(undoDepth()).toBe(3);
      core().beginSuppressHistory();
      const loaded = nextLoad();
      core().undo();
      await loaded;
      const restored = canvas.getObjects();
      expect(restored).toHaveLength(2);
      expect(dataOf(restored[0])?.shapeId).toMatch(UUID_PATTERN);
      expect(dataOf(restored[1])?.shapeId).toBeUndefined();
      core().endSuppressHistory();
    });
  });

  describe('read-only and layers', () => {
    it('locks every object and disables selection in read-only mode and unlocks again', () => {
      const canvas = init();
      const rect = plainRect();
      canvas.add(rect);
      canvas.setActiveObject(rect);
      canvas.isDrawingMode = true;

      core().setReadOnly(true);
      expect(core().isReadOnly()).toBe(true);
      expect(canvas.selection).toBe(false);
      expect(canvas.isDrawingMode).toBe(false);
      expect(canvas.skipTargetFind).toBe(true);
      expect(canvas.getActiveObject()).toBeUndefined();
      expect(rect.selectable).toBe(false);
      expect(rect.evented).toBe(false);
      expect([rect.lockMovementX, rect.lockMovementY, rect.lockRotation, rect.lockScalingX, rect.lockScalingY]).toEqual([
        true, true, true, true, true,
      ]);

      core().setReadOnly(false);
      expect(core().isReadOnly()).toBe(false);
      expect(canvas.selection).toBe(true);
      expect(canvas.skipTargetFind).toBe(false);
      expect(rect.selectable).toBe(true);
      expect(rect.lockMovementX).toBe(false);
    });

    it('remembers read-only before the canvas exists', () => {
      core().setReadOnly(true);
      expect(core().isReadOnly()).toBe(true);
    });

    it('applies layer visibility and lock to objects of known layers only', () => {
      const canvas = init();
      const background = plainRect();
      background.set('data', { layerId: 'background' });
      const building = plainRect();
      building.set('data', { layerId: 'building' });
      const unknown = plainRect();
      unknown.set('data', { layerId: 'nope' });
      const noLayer = plainRect();
      canvas.add(background, building, unknown, noLayer);

      layers().toggleVisibility('background');
      layers().toggleLock('building');
      core().syncLayerState();

      expect(background.visible).toBe(false);
      expect(background.selectable).toBe(true);
      expect(building.visible).toBe(true);
      expect(building.selectable).toBe(false);
      expect(building.evented).toBe(false);
      expect([building.lockMovementX, building.lockScalingY, building.lockRotation]).toEqual([true, true, true]);
      expect(unknown.visible).toBe(true);
      expect(unknown.selectable).toBe(true);
      expect(noLayer.selectable).toBe(true);
    });

    it('treats every layer as locked while read-only', () => {
      const canvas = init();
      const rect = plainRect();
      rect.set('data', { layerId: 'building' });
      canvas.add(rect);
      core().setReadOnly(true);
      core().syncLayerState();
      expect(rect.selectable).toBe(false);
      expect(rect.visible).toBe(true);
    });

    it('moves an object to another layer keeping its data and syncs the layer state', () => {
      const canvas = init();
      const rect = plainRect();
      rect.set('data', { shapeId: 's1', layerId: 'building' });
      canvas.add(rect);
      layers().toggleLock('markers');
      core().setObjectLayer(rect, 'markers');
      expect(dataOf(rect)).toEqual({ shapeId: 's1', layerId: 'markers' });
      expect(rect.selectable).toBe(false);
    });
  });

  describe('zoom and pan', () => {
    it('ignores zoom changes before the canvas exists', () => {
      core().setZoom(3);
      core().zoomIn();
      expect(core().zoom()).toBe(1);
    });

    it('clamps zoom levels and applies them to the canvas', () => {
      const canvas = init();
      core().setZoom(2);
      expect(core().zoom()).toBe(2);
      expect(canvas.getZoom()).toBe(2);
      core().setZoom(50);
      expect(core().zoom()).toBe(10);
      core().setZoom(0.01);
      expect(core().zoom()).toBe(0.1);
    });

    it('zooms in and out in steps of 0.1 around the canvas centre', () => {
      const canvas = init(800, 600);
      core().zoomIn();
      expect(core().zoom()).toBeCloseTo(1.1);
      const vpt = canvas.viewportTransform;
      expect(vpt[4]).toBeCloseTo(400 - 400 * 1.1);
      expect(vpt[5]).toBeCloseTo(300 - 300 * 1.1);
      core().zoomOut();
      core().zoomOut();
      expect(core().zoom()).toBeCloseTo(0.9);
    });

    it('resets zoom and pan', () => {
      const canvas = init();
      core().setZoom(3);
      canvas.relativePan({ x: 40, y: 30 } as never);
      core().resetZoom();
      expect(core().zoom()).toBe(1);
      expect(canvas.viewportTransform[4] + 0).toBe(0);
      expect(canvas.viewportTransform[5] + 0).toBe(0);
    });

    it('zoomToFit resets zoom on an empty canvas', () => {
      init();
      core().setZoom(4);
      core().zoomToFit();
      expect(core().zoom()).toBe(1);
    });

    it('zoomToFit scales the object bounds to 90 percent of the canvas', () => {
      const canvas = init(800, 600);
      canvas.add(plainRect(0, 0, 100, 50));
      core().zoomToFit();
      expect(core().zoom()).toBeCloseTo(7.2);
      expect(canvas.getZoom()).toBeCloseTo(7.2);
    });

    it('zoomToFit clamps to the minimum zoom', () => {
      const canvas = init(800, 600);
      canvas.add(plainRect(0, 0, 80000, 60000));
      core().zoomToFit();
      expect(core().zoom()).toBe(0.1);
    });

    it('wheel zooms exponentially around the pointer, clamps and swallows the event', () => {
      const canvas = init();
      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();
      canvas.fire('mouse:wheel', { e: { deltaY: -100, offsetX: 10, offsetY: 20, preventDefault, stopPropagation } } as never);
      expect(core().zoom()).toBeCloseTo(0.999 ** -100);
      expect(canvas.getZoom()).toBeCloseTo(0.999 ** -100);
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
      canvas.fire('mouse:wheel', { e: { deltaY: -100000, offsetX: 0, offsetY: 0, preventDefault, stopPropagation } } as never);
      expect(core().zoom()).toBe(10);
      canvas.fire('mouse:wheel', { e: { deltaY: 100000, offsetX: 0, offsetY: 0, preventDefault, stopPropagation } } as never);
      expect(core().zoom()).toBe(0.1);
    });

    it('pans with alt or middle mouse button and ends on mouse up', () => {
      const canvas = init();
      canvas.fire('mouse:down', { e: { altKey: true, button: 0, clientX: 100, clientY: 100 } } as never);
      expect(core().isPanning()).toBe(true);
      expect(canvas.upperCanvasEl.style.cursor).toBe('grabbing');
      canvas.fire('mouse:move', { e: { clientX: 130, clientY: 90 } } as never);
      expect(canvas.viewportTransform[4]).toBe(30);
      expect(canvas.viewportTransform[5]).toBe(-10);
      canvas.fire('mouse:move', { e: { clientX: 140, clientY: 90 } } as never);
      expect(canvas.viewportTransform[4]).toBe(40);
      canvas.fire('mouse:up', {} as never);
      expect(core().isPanning()).toBe(false);
      expect(canvas.upperCanvasEl.style.cursor).toBe('default');
      canvas.fire('mouse:move', { e: { clientX: 500, clientY: 500 } } as never);
      expect(canvas.viewportTransform[4]).toBe(40);

      canvas.fire('mouse:down', { e: { altKey: false, button: 1, clientX: 0, clientY: 0 } } as never);
      expect(core().isPanning()).toBe(true);
    });

    it('does not pan on a plain left click', () => {
      const canvas = init();
      canvas.fire('mouse:down', { e: { altKey: false, button: 0, clientX: 0, clientY: 0 } } as never);
      canvas.fire('mouse:move', { e: { clientX: 50, clientY: 50 } } as never);
      expect(core().isPanning()).toBe(false);
      expect(canvas.viewportTransform[4]).toBe(0);
    });
  });

  describe('object moving', () => {
    it('applies an anchor snap offset and shows the highlight', () => {
      const canvas = init();
      const rect = plainRect(101, 99);
      anchorSnapMock.findSnap.mockReturnValue({ offsetX: 3, offsetY: -2, targetPoint: { x: 7, y: 8 } });
      canvas.fire('object:moving', { target: rect } as never);
      expect(rect.left).toBe(104);
      expect(rect.top).toBe(97);
      expect(anchorSnapMock.findSnap).toHaveBeenCalledWith(rect, canvas);
      expect(anchorSnapMock.showHighlight).toHaveBeenCalledWith(canvas, { x: 7, y: 8 });
      expect(core().positionTick()).toBe(1);
    });

    it('falls back to grid snapping and hides the highlight', () => {
      const canvas = init();
      const rect = plainRect(109, 131);
      canvas.fire('object:moving', { target: rect } as never);
      expect(rect.left).toBe(100);
      expect(rect.top).toBe(140);
      expect(anchorSnapMock.hideHighlight).toHaveBeenCalledWith(canvas);
      tools().setSnapEnabled(false);
      const free = plainRect(109, 131);
      canvas.fire('object:moving', { target: free } as never);
      expect(free.left).toBe(109);
      expect(core().positionTick()).toBe(2);
    });

    it('ignores point handles', () => {
      const canvas = init();
      const handle = plainRect(109, 131);
      handle.set('data', { isPointHandle: true });
      canvas.fire('object:moving', { target: handle } as never);
      expect(handle.left).toBe(109);
      expect(anchorSnapMock.findSnap).not.toHaveBeenCalled();
      expect(core().positionTick()).toBe(0);
    });
  });

  describe('shape creation', () => {
    it('adds a snapped rectangle on the active layer and selects it', () => {
      const canvas = init();
      tools().setSnapSize(30);
      shapes().addRect();
      const rect = canvas.getObjects()[0] as Rect;
      expect(rect).toBeInstanceOf(Rect);
      expect([rect.left, rect.top, rect.width, rect.height]).toEqual([90, 90, 120, 90]);
      expect(rect.fill).toBe('transparent');
      expect(rect.stroke).toBe('#000000');
      expect(rect.strokeWidth).toBe(2);
      expect(dataOf(rect)?.shapeId).toMatch(UUID_PATTERN);
      expect(dataOf(rect)?.layerId).toBe('building');
      expect(canvas.getActiveObject()).toBe(rect);
      expect(undoDepth()).toBe(2);
    });

    it('uses raw values when snapping is disabled or the size is not positive', () => {
      const canvas = init();
      tools().setSnapEnabled(false);
      shapes().addCircle();
      expect((canvas.getObjects()[0] as Circle).radius).toBe(50);
      tools().setSnapEnabled(true);
      tools().setSnapSize(0);
      shapes().addCircle();
      expect((canvas.getObjects()[1] as Circle).radius).toBe(50);
      tools().setSnapSize(20);
      shapes().addCircle();
      expect((canvas.getObjects()[2] as Circle).radius).toBe(60);
    });

    it('omits the layer id when no layer is active', () => {
      const canvas = init();
      layers().setActiveLayer('');
      shapes().addCircle();
      expect(dataOf(canvas.getObjects()[0])?.layerId).toBeUndefined();
      expect(dataOf(canvas.getObjects()[0])?.shapeId).toMatch(UUID_PATTERN);
    });

    it('adds a snapped line', () => {
      const canvas = init();
      shapes().addLine();
      const line = canvas.getObjects()[0] as Line;
      expect(line).toBeInstanceOf(Line);
      expect([line.x1, line.y1, line.x2, line.y2]).toEqual([60, 60, 200, 60]);
      expect(line.stroke).toBe('#000000');
      expect(canvas.getActiveObject()).toBe(line);
    });

    it('adds a text box', () => {
      const canvas = init();
      shapes().addText('Hello');
      const textbox = canvas.getObjects()[0] as Textbox;
      expect(textbox).toBeInstanceOf(Textbox);
      expect(textbox.text).toBe('Hello');
      expect(textbox.fontSize).toBe(16);
      expect(textbox.fill).toBe('#000000');
      expect(textbox.width).toBe(200);
      expect(dataOf(textbox)?.layerId).toBe('building');
    });

    it('adds a regular polygon with radius 60 around the snapped centre, first vertex on top', () => {
      const canvas = init();
      shapes().addRegularPolygonAt(4, 105, 95);
      const polygon = canvas.getObjects()[0] as Polygon;
      expect(polygon).toBeInstanceOf(Polygon);
      const expected = [[100, 40], [160, 100], [100, 160], [40, 100]];
      expect(polygon.points).toHaveLength(4);
      polygon.points.forEach((p, i) => {
        expect(p.x).toBeCloseTo(expected[i][0]);
        expect(p.y).toBeCloseTo(expected[i][1]);
      });
      expect(dataOf(polygon)?.shapeId).toMatch(UUID_PATTERN);
      expect(canvas.getActiveObject()).toBe(polygon);
    });

    it('adds a polygon from snapped points', () => {
      const canvas = init();
      shapes().addPolygon([{ x: 11, y: 29 }, { x: 52, y: 9 }, { x: 70, y: 70 }]);
      const polygon = canvas.getObjects()[0] as Polygon;
      expect(polygon.points.map((p) => [p.x, p.y])).toEqual([[20, 20], [60, 0], [80, 80]]);
      expect(polygon.fill).toBe('transparent');
    });

    it('enables and disables free drawing with a black 2px pencil', () => {
      const canvas = init();
      shapes().enableFreeDrawing();
      expect(canvas.isDrawingMode).toBe(true);
      expect(canvas.freeDrawingBrush).toBeInstanceOf(PencilBrush);
      expect(canvas.freeDrawingBrush!.color).toBe('#000000');
      expect(canvas.freeDrawingBrush!.width).toBe(2);
      shapes().disableFreeDrawing();
      expect(canvas.isDrawingMode).toBe(false);
    });

    it('gives free drawn paths a fresh shape id on the active layer', () => {
      const canvas = init();
      const path = new Path('M 0 0 L 10 10');
      path.set('data', { markerId: 'old' });
      canvas.fire('path:created', { path } as never);
      expect(dataOf(path)?.markerId).toBeUndefined();
      expect(dataOf(path)?.shapeId).toMatch(UUID_PATTERN);
      expect(dataOf(path)?.layerId).toBe('building');
    });
  });

  describe('polygon drawing', () => {
    it('ignores points outside drawing mode', () => {
      const canvas = init();
      drawing().addPolygonPoint(10, 10);
      drawing().updatePolygonPreview(10, 10);
      expect(drawing().isInPolygonDrawingMode()).toBe(false);
      expect(canvas.getObjects()).toHaveLength(0);
    });

    it('shows a preview polyline from the second point and follows the mouse', () => {
      const canvas = init();
      drawing().startPolygonDrawing();
      expect(drawing().isInPolygonDrawingMode()).toBe(true);
      drawing().updatePolygonPreview(50, 50);
      expect(canvas.getObjects()).toHaveLength(0);
      drawing().addPolygonPoint(11, 9);
      expect(canvas.getObjects()).toHaveLength(0);
      drawing().updatePolygonPreview(49, 51);
      let previews = canvas.getObjects();
      expect(previews).toHaveLength(1);
      expect(previews[0]).toBeInstanceOf(Polyline);
      expect((previews[0] as Polyline).points.map((p) => [p.x, p.y])).toEqual([[20, 0], [40, 60]]);
      expect(previews[0].selectable).toBe(false);
      expect(previews[0].evented).toBe(false);
      drawing().addPolygonPoint(100, 0);
      previews = canvas.getObjects();
      expect(previews).toHaveLength(1);
      expect((previews[0] as Polyline).points.map((p) => [p.x, p.y])).toEqual([[20, 0], [100, 0]]);
    });

    it('finishes into a polygon with at least three points', () => {
      const canvas = init();
      drawing().startPolygonDrawing();
      drawing().addPolygonPoint(0, 0);
      drawing().addPolygonPoint(100, 0);
      drawing().addPolygonPoint(100, 100);
      drawing().finishPolygonDrawing();
      const objects = canvas.getObjects();
      expect(objects).toHaveLength(1);
      expect(objects[0]).toBeInstanceOf(Polygon);
      expect(objects[0].selectable).toBe(true);
      expect((objects[0] as Polygon).points.map((p) => [p.x, p.y])).toEqual([[0, 0], [100, 0], [100, 100]]);
      expect(dataOf(objects[0])?.layerId).toBe('building');
      expect(drawing().isInPolygonDrawingMode()).toBe(false);
    });

    it('cancels when finishing with fewer than three points', () => {
      const canvas = init();
      drawing().startPolygonDrawing();
      drawing().addPolygonPoint(0, 0);
      drawing().addPolygonPoint(100, 0);
      drawing().finishPolygonDrawing();
      expect(canvas.getObjects()).toHaveLength(0);
      expect(drawing().isInPolygonDrawingMode()).toBe(false);
    });

    it('cancel removes the preview and resets the points', () => {
      const canvas = init();
      drawing().startPolygonDrawing();
      drawing().addPolygonPoint(0, 0);
      drawing().addPolygonPoint(100, 0);
      drawing().cancelPolygonDrawing();
      expect(canvas.getObjects()).toHaveLength(0);
      drawing().startPolygonDrawing();
      drawing().addPolygonPoint(40, 40);
      expect(canvas.getObjects()).toHaveLength(0);
    });
  });

  describe('editing', () => {
    it('deletes all selected objects', () => {
      const canvas = init();
      const a = plainRect();
      const b = plainRect(300);
      const c = plainRect(500);
      canvas.add(a, b, c);
      select(canvas, a, b);
      editing().deleteSelected();
      expect(canvas.getObjects()).toEqual([c]);
      expect(canvas.getActiveObject()).toBeUndefined();
    });

    it('copies the active object and pastes an offset clone with a new id on the active layer', async () => {
      const canvas = init();
      expect(editing().hasClipboard()).toBe(false);
      editing().copySelected();
      expect(editing().hasClipboard()).toBe(false);
      const rect = plainRect(100, 100);
      rect.set('data', { shapeId: 'original', layerId: 'building' });
      canvas.add(rect);
      canvas.setActiveObject(rect);
      editing().copySelected();
      expect(editing().hasClipboard()).toBe(true);
      layers().setActiveLayer('markers');
      const depthBefore = undoDepth();
      await editing().paste();
      const objects = canvas.getObjects();
      expect(objects).toHaveLength(2);
      const pasted = objects[1];
      expect(pasted).toBeInstanceOf(Rect);
      expect(pasted.left).toBe(120);
      expect(pasted.top).toBe(120);
      expect(dataOf(pasted)?.shapeId).toMatch(UUID_PATTERN);
      expect(dataOf(pasted)?.layerId).toBe('markers');
      expect(canvas.getActiveObject()).toBe(pasted);
      expect(undoDepth()).toBe(depthBefore + 2);
    });

    it('paste does nothing without clipboard', async () => {
      const canvas = init();
      await editing().paste();
      expect(canvas.getObjects()).toHaveLength(0);
    });

    it('flips the active object and records history', () => {
      const canvas = init();
      const rect = plainRect();
      canvas.add(rect);
      canvas.setActiveObject(rect);
      const depth = undoDepth();
      editing().flipHorizontal();
      expect(rect.flipX).toBe(true);
      editing().flipHorizontal();
      expect(rect.flipX).toBe(false);
      editing().flipVertical();
      expect(rect.flipY).toBe(true);
      expect(undoDepth()).toBe(depth + 3);
    });

    it('does not flip or record without an active object', () => {
      init();
      editing().flipHorizontal();
      editing().flipVertical();
      expect(undoDepth()).toBe(1);
    });

    it('moves the active object by a snapped delta', () => {
      const canvas = init();
      const rect = plainRect(100, 100);
      canvas.add(rect);
      canvas.setActiveObject(rect);
      const depth = undoDepth();
      editing().moveSelectedByDelta(15, 7);
      expect(rect.left).toBe(120);
      expect(rect.top).toBe(100);
      expect(core().positionTick()).toBe(1);
      expect(undoDepth()).toBe(depth + 1);
    });

    it('resizes the active object by a snapped delta via scaling with a minimum of 1', () => {
      const canvas = init();
      const rect = plainRect(100, 100, 120, 80);
      canvas.add(rect);
      canvas.setActiveObject(rect);
      editing().resizeSelectedByDelta(10, 0);
      expect(rect.width).toBe(120);
      expect(rect.scaleX).toBeCloseTo(140 / 120);
      expect(rect.scaleY).toBe(1);
      tools().setSnapEnabled(false);
      editing().resizeSelectedByDelta(-1000, -1000);
      expect(rect.scaleX).toBeCloseTo(1 / 120);
      expect(rect.scaleY).toBeCloseTo(1 / 80);
    });

    it('groups two or more selected objects into a new shape', () => {
      const canvas = init();
      const a = plainRect(0, 0);
      const b = plainRect(300, 0);
      canvas.add(a, b);
      canvas.setActiveObject(a);
      editing().groupSelected();
      expect(canvas.getObjects()).toHaveLength(2);
      select(canvas, a, b);
      editing().groupSelected();
      const objects = canvas.getObjects();
      expect(objects).toHaveLength(1);
      expect(objects[0]).toBeInstanceOf(Group);
      expect((objects[0] as Group).getObjects()).toEqual([a, b]);
      expect(dataOf(objects[0])?.shapeId).toMatch(UUID_PATTERN);
      expect(dataOf(objects[0])?.layerId).toBe('building');
      expect(canvas.getActiveObject()).toBe(objects[0]);
    });

    it('ungroups the active group back into its items', () => {
      const canvas = init();
      const a = plainRect(0, 0);
      const b = plainRect(300, 0);
      const group = new Group([a, b]);
      canvas.add(group);
      editing().ungroupSelected();
      expect(canvas.getObjects()).toEqual([group]);
      canvas.setActiveObject(group);
      editing().ungroupSelected();
      expect(canvas.getObjects()).toEqual([a, b]);
      expect(canvas.getActiveObject()).toBeUndefined();
    });

    it('closes an open path once and records history', () => {
      const canvas = init();
      const path = new Path('M 0 0 L 10 0 L 10 10');
      canvas.add(path);
      canvas.setActiveObject(path);
      const depth = undoDepth();
      editing().closeSelectedPath();
      const commands = commandsOf(path);
      expect(commands[commands.length - 1]).toEqual(['Z']);
      editing().closeSelectedPath();
      expect(commandsOf(path).filter((c) => c[0] === 'Z')).toHaveLength(1);
      expect(undoDepth()).toBe(depth + 1);
    });

    it('opens a closed path, makes it transparent and records history', () => {
      const canvas = init();
      const path = new Path('M 0 0 L 10 0 L 10 10 Z', { fill: '#ff0000' });
      canvas.add(path);
      canvas.setActiveObject(path);
      const depth = undoDepth();
      editing().openSelectedPath();
      expect(commandsOf(path).some((c) => c[0] === 'Z')).toBe(false);
      expect(path.fill).toBe('transparent');
      editing().openSelectedPath();
      expect(undoDepth()).toBe(depth + 1);
    });

    it('ignores path open and close for non-path objects', () => {
      const canvas = init();
      const rect = plainRect();
      canvas.add(rect);
      canvas.setActiveObject(rect);
      const depth = undoDepth();
      editing().closeSelectedPath();
      editing().openSelectedPath();
      expect(undoDepth()).toBe(depth);
    });

    it('converts a rectangle into a path keeping style and data', () => {
      const canvas = init();
      const rect = new Rect({ left: 0, top: 0, width: 100, height: 50, fill: '#ff0000', stroke: '#00ff00', strokeWidth: 3 });
      rect.set('data', { shapeId: 's1', layerId: 'background' });
      canvas.add(rect);
      canvas.setActiveObject(rect);
      editing().convertSelectedToPath();
      const objects = canvas.getObjects();
      expect(objects).toHaveLength(1);
      const path = objects[0] as Path;
      expect(path).toBeInstanceOf(Path);
      expect(path.fill).toBe('#ff0000');
      expect(path.stroke).toBe('#00ff00');
      expect(path.strokeWidth).toBe(3);
      expect(path.objectCaching).toBe(false);
      expect(dataOf(path)).toEqual({ shapeId: 's1', layerId: 'background' });
      expect(commandsOf(path).some((c) => c[0] === 'Z')).toBe(true);
      expect(canvas.getActiveObject()).toBe(path);
    });

    it('gives a converted shape without id a new shape id', () => {
      const canvas = init();
      const circle = new Circle({ left: 0, top: 0, radius: 20 });
      canvas.add(circle);
      canvas.setActiveObject(circle);
      editing().convertSelectedToPath();
      expect(canvas.getObjects()[0]).toBeInstanceOf(Path);
      expect(dataOf(canvas.getObjects()[0])?.shapeId).toMatch(UUID_PATTERN);
    });

    it('does not convert text', () => {
      const canvas = init();
      const textbox = new Textbox('x');
      canvas.add(textbox);
      canvas.setActiveObject(textbox);
      editing().convertSelectedToPath();
      expect(canvas.getObjects()).toEqual([textbox]);
    });

    it('changes the stacking order', () => {
      const canvas = init();
      const a = plainRect();
      const b = plainRect();
      canvas.add(a, b);
      canvas.setActiveObject(a);
      editing().bringToFront();
      expect(canvas.getObjects()).toEqual([b, a]);
      editing().sendToBack();
      expect(canvas.getObjects()).toEqual([a, b]);
    });
  });

  describe('styling', () => {
    it('applies stroke, fill, width and opacity without recording history', () => {
      const canvas = init();
      const rect = plainRect();
      canvas.add(rect);
      canvas.setActiveObject(rect);
      const depth = undoDepth();
      styling().applyStrokeColor('#123456');
      styling().applyFillColor('#abcdef');
      styling().applyStrokeWidth(7);
      styling().applyOpacity(0.5);
      expect(rect.stroke).toBe('#123456');
      expect(rect.fill).toBe('#abcdef');
      expect(rect.strokeWidth).toBe(7);
      expect(rect.opacity).toBe(0.5);
      expect(undoDepth()).toBe(depth);
    });

    it('updates the free drawing brush even without an active object', () => {
      const canvas = init();
      expect(() => styling().applyStrokeColor('#111111')).not.toThrow();
      shapes().enableFreeDrawing();
      styling().applyStrokeColor('#ff0000');
      styling().applyStrokeWidth(9);
      expect(canvas.freeDrawingBrush!.color).toBe('#ff0000');
      expect(canvas.freeDrawingBrush!.width).toBe(9);
    });

    it('applies text styles to text objects and records each change', () => {
      const canvas = init();
      const textbox = new Textbox('Text');
      canvas.add(textbox);
      canvas.setActiveObject(textbox);
      const depth = undoDepth();
      styling().applyFontFamily('Arial');
      styling().applyFontSize(0);
      styling().applyBold(true);
      styling().applyItalic(true);
      styling().applyUnderline(true);
      styling().applyLinethrough(true);
      styling().applyTextAlign('center');
      styling().applyTextColor('#00ff00');
      expect(textbox.fontFamily).toBe('Arial');
      expect(textbox.fontSize).toBe(1);
      expect(textbox.fontWeight).toBe('bold');
      expect(textbox.fontStyle).toBe('italic');
      expect(textbox.underline).toBe(true);
      expect(textbox.linethrough).toBe(true);
      expect(textbox.textAlign).toBe('center');
      expect(textbox.fill).toBe('#00ff00');
      expect(undoDepth()).toBe(depth + 8);
      styling().applyBold(false);
      styling().applyItalic(false);
      expect(textbox.fontWeight).toBe('normal');
      expect(textbox.fontStyle).toBe('normal');
    });

    it('ignores text styles on non-text objects', () => {
      const canvas = init();
      const rect = plainRect();
      canvas.add(rect);
      canvas.setActiveObject(rect);
      const depth = undoDepth();
      styling().applyFontSize(30);
      styling().applyTextColor('#00ff00');
      expect(rect.fill).not.toBe('#00ff00');
      expect(undoDepth()).toBe(depth);
    });

    it('sets and removes a shadow', () => {
      const canvas = init();
      const rect = plainRect();
      canvas.add(rect);
      canvas.setActiveObject(rect);
      styling().applyObjectShadow(true, '#333333', 5, 2, 3);
      const shadow = rect.shadow as Shadow;
      expect(shadow).toBeInstanceOf(Shadow);
      expect([shadow.color, shadow.blur, shadow.offsetX, shadow.offsetY]).toEqual(['#333333', 5, 2, 3]);
      styling().applyObjectShadow(false, '#333333', 5, 2, 3);
      expect(rect.shadow).toBeNull();
      expect(undoDepth()).toBe(4);
    });

    it('applies gradients by direction based on the scaled size', () => {
      const canvas = init();
      const rect = plainRect(0, 0, 120, 80);
      rect.set({ scaleX: 2 });
      canvas.add(rect);
      canvas.setActiveObject(rect);
      const gradient = (): GradientView => rect.fill as unknown as GradientView;

      styling().applyGradientFill(true, '#111111', '#222222', 'radial');
      expect(rect.fill).toBeInstanceOf(Gradient);
      expect(gradient().type).toBe('radial');
      expect(gradient().coords).toMatchObject({ r1: 0, r2: 120, x1: 0, y1: 0, x2: 0, y2: 0 });
      expect(gradient().colorStops.map((s) => [s.offset, s.color])).toEqual([[0, '#111111'], [1, '#222222']]);

      styling().applyGradientFill(true, '#111111', '#222222', 'vertical');
      expect(gradient().type).toBe('linear');
      expect(gradient().coords).toMatchObject({ x1: 0, y1: -40, x2: 0, y2: 40 });
      styling().applyGradientFill(true, '#111111', '#222222', 'diagonal-down');
      expect(gradient().coords).toMatchObject({ x1: -120, y1: -40, x2: 120, y2: 40 });
      styling().applyGradientFill(true, '#111111', '#222222', 'diagonal-up');
      expect(gradient().coords).toMatchObject({ x1: -120, y1: 40, x2: 120, y2: -40 });
      styling().applyGradientFill(true, '#111111', '#222222', 'horizontal');
      expect(gradient().coords).toMatchObject({ x1: -120, y1: 0, x2: 120, y2: 0 });

      styling().applyGradientFill(false, '#333333', '#444444', 'radial');
      expect(rect.fill).toBe('#333333');
      expect(undoDepth()).toBe(8);
    });
  });

  describe('serialization', () => {
    it('serializes objects including their data', () => {
      const canvas = init();
      const rect = plainRect();
      rect.set('data', { shapeId: 's1', layerId: 'building' });
      canvas.add(rect);
      const parsed = JSON.parse(core().toJSON()) as { objects: { data: FloorPlanObjectData }[] };
      expect(parsed.objects).toHaveLength(1);
      expect(parsed.objects[0].data).toEqual({ shapeId: 's1', layerId: 'building' });
    });

    it('loads JSON, assigns missing shape ids to plain shapes only and syncs layers', async () => {
      const source = init();
      const plain = plainRect();
      plain.set('data', { layerId: 'background' });
      const connector = plainRect();
      connector.set('data', { isConnector: true });
      const marker = plainRect();
      marker.set('data', { markerId: 'm1' });
      const live = plainRect();
      live.set('data', { liveMarker: true });
      const bare = plainRect();
      source.add(plain, connector, marker, live, bare);
      const json = core().toJSON();
      source.clear();

      layers().toggleLock('background');
      await core().loadFromJSON(json);
      const loaded = core().getCanvas()!.getObjects();
      expect(loaded).toHaveLength(5);
      expect(dataOf(loaded[0])?.shapeId).toMatch(UUID_PATTERN);
      expect(dataOf(loaded[0])?.layerId).toBe('background');
      expect(loaded[0].selectable).toBe(false);
      expect(dataOf(loaded[1])?.shapeId).toBeUndefined();
      expect(dataOf(loaded[2])?.shapeId).toBeUndefined();
      expect(dataOf(loaded[3])?.shapeId).toBeUndefined();
      expect(dataOf(loaded[4])?.shapeId).toMatch(UUID_PATTERN);
    });

    it('exports SVG markup', () => {
      const canvas = init();
      canvas.add(plainRect());
      expect(core().toSVG()).toContain('<svg');
    });

    it('exports a PNG data URL at multiplier 1', () => {
      init();
      const result = core().toDataURL();
      expect(result).toBe(STUB_DATA_URL);
      const calls = vi.mocked(HTMLCanvasElement.prototype.toDataURL).mock.calls;
      expect(calls[calls.length - 1][0]).toBe('image/png');
    });

    it('replaces the content with SVG objects on the active layer and adopts the SVG size', async () => {
      const canvas = init();
      canvas.add(plainRect());
      await core().loadFromSVG(
        '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect x="0" y="0" width="10" height="10" fill="#ff0000"/></svg>',
      );
      const objects = canvas.getObjects();
      expect(objects).toHaveLength(1);
      expect(dataOf(objects[0])?.layerId).toBe('building');
      expect(dataOf(objects[0])?.shapeId).toBeUndefined();
      expect(canvas.getWidth()).toBe(300);
      expect(canvas.getHeight()).toBe(200);
    });
  });

  describe('work markers', () => {
    const fullMarker: IFloorPlanWorkMarker = {
      id: 'm1',
      floorPlanId: 'fp',
      workId: 'w1',
      shiftId: 's1',
      clientId: 'c1',
      clientName: 'Anna',
      abbreviation: 'AB',
      startTime: '08:00',
      endTime: '16:00',
      x: 10,
      y: 20,
      width: 150,
      height: 60,
      color: '#ff8000',
      markerType: FloorPlanMarkerType.Location,
    };

    it('renders a marker as text box with name, abbreviation and time', () => {
      const canvas = init();
      markers().addWorkMarker(fullMarker);
      const textbox = canvas.getObjects()[0] as Textbox;
      expect(textbox).toBeInstanceOf(Textbox);
      expect(textbox.text).toBe('Anna\nAB\n08:00 - 16:00');
      expect([textbox.left, textbox.top, textbox.width, textbox.fontSize]).toEqual([10, 20, 150, 12]);
      expect(textbox.fill).toBe('#ff8000');
      expect(textbox.stroke).toBe('#ff8000');
      expect(textbox.strokeWidth).toBe(1);
      expect(textbox.backgroundColor).toBe('rgba(255, 128, 0, 0.15)');
      expect(dataOf(textbox)).toEqual({
        markerId: 'm1',
        markerType: FloorPlanMarkerType.Location,
        shiftId: 's1',
        workId: 'w1',
        clientId: 'c1',
        clientName: 'Anna',
        abbreviation: 'AB',
        startTime: '08:00',
        endTime: '16:00',
        fromDate: undefined,
        untilDate: undefined,
        layerId: 'building',
      });
    });

    it('falls back to label, then to a default text, colour and width', () => {
      const canvas = init();
      const base: IFloorPlanWorkMarker = { floorPlanId: 'fp', x: 0, y: 0, width: 0, height: 0, markerType: FloorPlanMarkerType.Custom };
      markers().addWorkMarker({ ...base, label: 'Exit' });
      markers().addWorkMarker(base);
      markers().addWorkMarker({ ...base, startTime: '07:00' });
      const [labelled, empty, timeOnly] = canvas.getObjects() as Textbox[];
      expect(labelled.text).toBe('Exit');
      expect(empty.text).toBe('Marker');
      expect(empty.fill).toBe('#000000');
      expect(empty.backgroundColor).toBe('#ffffff80');
      expect(empty.width).toBe(120);
      expect(timeOnly.text).toBe('07:00 - ');
    });

    it('re-renders markers replacing only previous markers', () => {
      const canvas = init();
      const shape = plainRect();
      canvas.add(shape);
      markers().addWorkMarker(fullMarker);
      markers().renderWorkMarkers([{ ...fullMarker, id: 'm2' }, { ...fullMarker, id: 'm3' }]);
      const objects = canvas.getObjects();
      expect(objects).toHaveLength(3);
      expect(objects[0]).toBe(shape);
      expect(objects.slice(1).map((o) => dataOf(o)?.markerId)).toEqual(['m2', 'm3']);
    });

    it('extracts markers from the canvas', () => {
      const canvas = init();
      canvas.add(plainRect());
      markers().addWorkMarker(fullMarker);
      markers().addWorkMarker({ ...fullMarker, id: '', color: undefined });
      const legacy = new Textbox('Legacy', { left: 5, top: 6 });
      legacy.set('data', { markerId: 'm9' });
      canvas.add(legacy);

      const extracted = markers().extractWorkMarkers('plan-1');
      expect(extracted).toHaveLength(3);
      const first = canvas.getObjects()[1] as Textbox;
      expect(extracted[0]).toEqual({
        id: 'm1',
        floorPlanId: 'plan-1',
        shiftId: 's1',
        workId: 'w1',
        clientId: 'c1',
        clientName: 'Anna',
        abbreviation: 'AB',
        startTime: '08:00',
        endTime: '16:00',
        fromDate: undefined,
        untilDate: undefined,
        x: 10,
        y: 20,
        width: 150,
        height: first.height,
        color: '#ff8000',
        label: 'Anna\nAB\n08:00 - 16:00',
        markerType: FloorPlanMarkerType.Location,
      });
      expect(extracted[1].id).toBeUndefined();
      expect(extracted[1].color).toBe('#000000');
      expect(extracted[2].markerType).toBe(FloorPlanMarkerType.Work);
      expect(extracted[2].label).toBe('Legacy');
    });

    it('removes only work markers', () => {
      const canvas = init();
      const shape = plainRect();
      canvas.add(shape);
      markers().addWorkMarker(fullMarker);
      markers().removeWorkMarkersFromCanvas();
      expect(canvas.getObjects()).toEqual([shape]);
    });
  });

  describe('live markers', () => {
    const entry = (overrides: Partial<ILiveMarkerEntry> = {}): ILiveMarkerEntry => ({
      clientId: 'c',
      clientName: 'Ben',
      startTime: '09:00',
      endTime: '17:00',
      phone: '+41 00',
      imageDataUrl: null,
      display: { name: true, time: true, phone: true, image: false },
      ...overrides,
    });

    it('lays out text boxes in a five column grid', () => {
      const canvas = init();
      const entries = Array.from({ length: 7 }, () => entry());
      markers().renderLiveMarkers(entries);
      const boxes = canvas.getObjects() as Textbox[];
      expect(boxes).toHaveLength(7);
      expect([boxes[0].left, boxes[0].top]).toEqual([50, 50]);
      expect([boxes[4].left, boxes[4].top]).toEqual([690, 50]);
      expect([boxes[5].left, boxes[5].top]).toEqual([50, 160]);
      expect([boxes[6].left, boxes[6].top]).toEqual([210, 160]);
      expect(boxes[0].text).toBe('Ben\n09:00 - 17:00\n+41 00');
      expect(boxes[0].width).toBe(140);
      expect(boxes[0].fontSize).toBe(11);
      expect(boxes[0].padding).toBe(4);
      expect(boxes[0].fill).toBe('#2563eb');
      expect(boxes[0].backgroundColor).toBe('rgba(37, 99, 235, 0.15)');
      expect(boxes[0].selectable).toBe(false);
      expect(boxes[0].evented).toBe(false);
      expect(dataOf(boxes[6])).toEqual({ liveMarker: true, index: 6 });
    });

    it('respects the display flags and skips empty text', () => {
      const canvas = init();
      markers().renderLiveMarkers([
        entry({ display: { name: true, time: false, phone: false, image: false }, color: '#000000' }),
        entry({ display: { name: false, time: false, phone: false, image: false } }),
        entry({ phone: null, startTime: '', endTime: '', display: { name: false, time: true, phone: true, image: false } }),
      ]);
      const boxes = canvas.getObjects() as Textbox[];
      expect(boxes).toHaveLength(1);
      expect(boxes[0].text).toBe('Ben');
      expect(boxes[0].fill).toBe('#000000');
    });

    it('draws a person placeholder above the text when no image is available', () => {
      const canvas = init();
      markers().renderLiveMarkers([entry({ display: { name: true, time: false, phone: false, image: true }, color: '#ff0000' })]);
      const objects = canvas.getObjects();
      expect(objects).toHaveLength(4);
      const [background, head, body, text] = objects;
      expect(background).toBeInstanceOf(Rect);
      expect([background.left, background.top, background.width, background.height]).toEqual([50, 50, 40, 40]);
      expect(background.fill).toBe('rgba(255, 0, 0, 0.18)');
      expect(head).toBeInstanceOf(Circle);
      expect((head as Circle).radius).toBeCloseTo(6.4);
      expect(body).toBeInstanceOf(Path);
      for (const part of [background, head, body]) {
        expect(dataOf(part)).toEqual({ liveMarker: true, index: 0, isMarkerPlaceholder: true });
        expect(part.selectable).toBe(false);
      }
      expect(text.top).toBe(94);
    });

    it('loads a provided image asynchronously instead of the placeholder', () => {
      const canvas = init();
      markers().renderLiveMarkers([
        entry({ imageDataUrl: 'data:image/png;base64,AAAA', display: { name: true, time: false, phone: false, image: true } }),
      ]);
      const objects = canvas.getObjects();
      expect(objects).toHaveLength(1);
      expect(objects[0]).toBeInstanceOf(Textbox);
      expect(objects[0].top).toBe(94);
    });

    it('re-rendering and clearing remove only live markers', () => {
      const canvas = init();
      const shape = plainRect();
      canvas.add(shape);
      markers().renderLiveMarkers([entry(), entry()]);
      markers().renderLiveMarkers([entry()]);
      expect(canvas.getObjects()).toHaveLength(2);
      markers().clearLiveMarkers();
      expect(canvas.getObjects()).toEqual([shape]);
    });
  });
});
