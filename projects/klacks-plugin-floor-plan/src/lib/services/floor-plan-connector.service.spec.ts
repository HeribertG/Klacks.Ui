// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for pure-math methods in FloorPlanConnectorService.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Canvas } from 'fabric';
import { FloorPlanConnectorService } from './floor-plan-connector.service';
import { ConnectorRoutingType } from './floor-plan-tool.service';

interface MockShape {
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
}

interface MockCanvas {
  getObjects: () => object[];
  add: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  renderAll: ReturnType<typeof vi.fn>;
}

interface ServicePrivate {
  canvas: MockCanvas | null;
  shapeConnectors: Map<string, string[]>;
  connectorMap: Map<string, unknown>;
  getPortCoords: (obj: MockShape, side: string) => { x: number; y: number };
  getDefaultControlPoint: (x1: number, y1: number, x2: number, y2: number) => { x: number; y: number };
  isHorizontalRoute: (start: { portSide: string; x: number; y: number }, end: { portSide: string; x: number; y: number }) => boolean;
  getPathData: (start: object, end: object, routing: ConnectorRoutingType, controlPoint: { x: number; y: number }) => string;
  getEndAngleAutoRoute: (start: object, end: object) => number;
}

function mockShape(left: number, top: number, width: number, height: number): MockShape {
  return { left, top, width, height, scaleX: 1, scaleY: 1 };
}

function makeCanvasWithObjects(objects: object[]): MockCanvas {
  return {
    getObjects: () => objects,
    add: vi.fn(),
    remove: vi.fn(),
    renderAll: vi.fn(),
  };
}

describe('FloorPlanConnectorService', () => {
  let service: FloorPlanConnectorService;

  beforeEach(() => {
    service = new FloorPlanConnectorService();
  });

  it('should instantiate', () => {
    expect(service).toBeTruthy();
  });

  describe('getPortCoords', () => {
    it('returns right port at center-right', () => {
      const shape = mockShape(0, 0, 100, 50);
      const result = (service as unknown as ServicePrivate).getPortCoords(shape, 'right');
      expect(result).toEqual({ x: 100, y: 25 });
    });

    it('returns left port at center-left', () => {
      const shape = mockShape(20, 10, 100, 50);
      const result = (service as unknown as ServicePrivate).getPortCoords(shape, 'left');
      expect(result).toEqual({ x: 20, y: 35 });
    });

    it('returns top port at center-top', () => {
      const shape = mockShape(0, 0, 100, 50);
      const result = (service as unknown as ServicePrivate).getPortCoords(shape, 'top');
      expect(result).toEqual({ x: 50, y: 0 });
    });

    it('returns bottom port at center-bottom', () => {
      const shape = mockShape(0, 0, 100, 50);
      const result = (service as unknown as ServicePrivate).getPortCoords(shape, 'bottom');
      expect(result).toEqual({ x: 50, y: 50 });
    });

    it('respects scaleX and scaleY', () => {
      const shape = { left: 0, top: 0, width: 100, height: 50, scaleX: 2, scaleY: 2 };
      const result = (service as unknown as ServicePrivate).getPortCoords(shape, 'right');
      expect(result).toEqual({ x: 200, y: 50 });
    });
  });

  describe('getDefaultControlPoint', () => {
    it('places control point at horizontal midpoint, 60px above minimum y', () => {
      const result = (service as unknown as ServicePrivate).getDefaultControlPoint(0, 100, 200, 100);
      expect(result).toEqual({ x: 100, y: 40 });
    });
  });

  describe('getPortNear', () => {
    it('returns null when canvas is not initialized', () => {
      expect(service.getPortNear(50, 50)).toBeNull();
    });

    it('returns null when no shape is within PORT_HIT_RADIUS', () => {
      const shape = { data: { shapeId: 'abc' }, left: 0, top: 0, width: 100, height: 50, scaleX: 1, scaleY: 1 };
      (service as unknown as ServicePrivate).canvas = makeCanvasWithObjects([shape]);
      expect(service.getPortNear(200, 200)).toBeNull();
    });

    it('returns nearest PortHit when within 20px of a port', () => {
      const shape = { data: { shapeId: 'abc' }, left: 0, top: 0, width: 100, height: 50, scaleX: 1, scaleY: 1 };
      (service as unknown as ServicePrivate).canvas = makeCanvasWithObjects([shape]);
      const hit = service.getPortNear(110, 25);
      expect(hit).not.toBeNull();
      expect(hit!.shapeId).toBe('abc');
      expect(hit!.portSide).toBe('right');
      expect(hit!.x).toBe(100);
      expect(hit!.y).toBe(25);
    });

    it('returns null when point is exactly at PORT_HIT_RADIUS boundary (21px away)', () => {
      const shape = { data: { shapeId: 'abc' }, left: 0, top: 0, width: 100, height: 50, scaleX: 1, scaleY: 1 };
      (service as unknown as ServicePrivate).canvas = makeCanvasWithObjects([shape]);
      expect(service.getPortNear(121, 25)).toBeNull();
    });

    it('skips objects with data.isConnector', () => {
      const connector = { data: { shapeId: 'abc', isConnector: true }, left: 0, top: 0, width: 100, height: 50, scaleX: 1, scaleY: 1 };
      (service as unknown as ServicePrivate).canvas = makeCanvasWithObjects([connector]);
      expect(service.getPortNear(100, 25)).toBeNull();
    });

    it('skips objects without data.shapeId', () => {
      const noId = { data: {}, left: 0, top: 0, width: 100, height: 50, scaleX: 1, scaleY: 1 };
      (service as unknown as ServicePrivate).canvas = makeCanvasWithObjects([noId]);
      expect(service.getPortNear(100, 25)).toBeNull();
    });
  });

  describe('hidePortIndicators', () => {
    it('removes only objects with data.isPortIndicator', () => {
      const indicator = { data: { isPortIndicator: true } };
      const shape = { data: { shapeId: 'abc' } };
      const mockCanvas = makeCanvasWithObjects([indicator, shape]);
      (service as unknown as ServicePrivate).canvas = mockCanvas;
      service.hidePortIndicators();
      expect(mockCanvas.remove).toHaveBeenCalledWith(indicator);
      expect(mockCanvas.remove).not.toHaveBeenCalledWith(shape);
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('does nothing when canvas is null', () => {
      expect(() => service.hidePortIndicators()).not.toThrow();
    });
  });

  describe('isHorizontalRoute', () => {
    const startH = { portSide: 'right' as const, x: 10, y: 60 };
    const endH   = { portSide: 'left'  as const, x: 210, y: 20 };
    const startV = { portSide: 'bottom' as const, x: 40, y: 10 };
    const endV   = { portSide: 'top'   as const, x: 150, y: 70 };

    it('returns true for right to left ports', () => {
      expect((service as unknown as ServicePrivate).isHorizontalRoute(startH, endH)).toBe(true);
    });

    it('returns false for bottom to top ports', () => {
      expect((service as unknown as ServicePrivate).isHorizontalRoute(startV, endV)).toBe(false);
    });

    it('returns true for free endpoints with larger horizontal delta', () => {
      const a = { portSide: 'free' as const, x: 0, y: 50 };
      const b = { portSide: 'free' as const, x: 200, y: 10 };
      expect((service as unknown as ServicePrivate).isHorizontalRoute(a, b)).toBe(true);
    });

    it('returns false for free endpoints with larger vertical delta', () => {
      const a = { portSide: 'free' as const, x: 0, y: 0 };
      const b = { portSide: 'free' as const, x: 10, y: 100 };
      expect((service as unknown as ServicePrivate).isHorizontalRoute(a, b)).toBe(false);
    });
  });

  describe('getPathData', () => {
    const start = { portSide: 'right' as const, x: 10, y: 60 };
    const end   = { portSide: 'left'  as const, x: 210, y: 20 };
    const startV = { portSide: 'bottom' as const, x: 40, y: 10 };
    const endV   = { portSide: 'top'   as const, x: 150, y: 70 };
    const freeH  = { portSide: 'free' as const, x: 0, y: 50 };
    const freeH2 = { portSide: 'free' as const, x: 200, y: 10 };

    describe('Straight', () => {
      it('produces a straight line', () => {
        const d = (service as unknown as ServicePrivate).getPathData(start, end, ConnectorRoutingType.Straight, { x: 0, y: 0 });
        expect(d).toBe('M 10 60 L 210 20');
      });
    });

    describe('Curved', () => {
      it('produces a quadratic Bezier', () => {
        const cp = { x: 110, y: -20 };
        const d = (service as unknown as ServicePrivate).getPathData(start, end, ConnectorRoutingType.Curved, cp);
        expect(d).toBe('M 10 60 Q 110 -20 210 20');
      });
    });

    describe('SCurve', () => {
      it('horizontal: produces cubic Bezier with symmetric control points', () => {
        const d = (service as unknown as ServicePrivate).getPathData(start, end, ConnectorRoutingType.SCurve, { x: 0, y: 0 });
        expect(d).toBe('M 10 60 C 110 60 110 20 210 20');
      });

      it('vertical: produces cubic Bezier with vertical control points', () => {
        const d = (service as unknown as ServicePrivate).getPathData(startV, endV, ConnectorRoutingType.SCurve, { x: 0, y: 0 });
        expect(d).toBe('M 40 10 C 40 40 150 40 150 70');
      });

      it('free horizontal endpoints fall back to delta comparison', () => {
        const d = (service as unknown as ServicePrivate).getPathData(freeH, freeH2, ConnectorRoutingType.SCurve, { x: 0, y: 0 });
        expect(d).toBe('M 0 50 C 100 50 100 10 200 10');
      });
    });

    describe('Orthogonal', () => {
      it('horizontal: produces 3-segment step path', () => {
        const d = (service as unknown as ServicePrivate).getPathData(start, end, ConnectorRoutingType.Orthogonal, { x: 0, y: 0 });
        expect(d).toBe('M 10 60 L 110 60 L 110 20 L 210 20');
      });

      it('vertical: produces 3-segment step path', () => {
        const d = (service as unknown as ServicePrivate).getPathData(startV, endV, ConnectorRoutingType.Orthogonal, { x: 0, y: 0 });
        expect(d).toBe('M 40 10 L 40 40 L 150 40 L 150 70');
      });
    });
  });

  describe('reattachConnectors', () => {
    it('transfers connectors from one old shape to a new shape', () => {
      const canvas = makeCanvasWithObjects([
        { data: { shapeId: 'new', layerId: 'l' }, left: 0, top: 0, width: 100, height: 50, scaleX: 1, scaleY: 1 },
      ]);
      service.init(canvas as unknown as Canvas);
      (service as unknown as ServicePrivate).shapeConnectors.set('old-a', ['conn-1']);
      (service as unknown as ServicePrivate).connectorMap.set('conn-1', {
        id: 'conn-1',
        start: { shapeId: 'old-a', portSide: 'right', x: 100, y: 25 },
        end: { portSide: 'free', x: 200, y: 25 },
        routing: 'straight',
        arrowhead: 'single',
      });

      const result = service.reattachConnectors(['old-a'], 'new');

      expect(result.has('conn-1')).toBe(true);
      const data = (service as unknown as ServicePrivate).connectorMap.get('conn-1') as { start: { shapeId: string }; end: { shapeId: string } };
      expect(data.start.shapeId).toBe('new');
      expect((service as unknown as ServicePrivate).shapeConnectors.has('old-a')).toBe(false);
      expect((service as unknown as ServicePrivate).shapeConnectors.get('new')).toContain('conn-1');
    });

    it('returns empty set and leaves state unchanged for empty oldShapeIds', () => {
      const canvas = makeCanvasWithObjects([]);
      service.init(canvas as unknown as Canvas);

      const result = service.reattachConnectors([], 'new');

      expect(result.size).toBe(0);
      expect((service as unknown as ServicePrivate).shapeConnectors.size).toBe(0);
    });

    it('merges with existing connectors on newShapeId without duplicates', () => {
      const canvas = makeCanvasWithObjects([
        { data: { shapeId: 'new', layerId: 'l' }, left: 0, top: 0, width: 100, height: 50, scaleX: 1, scaleY: 1 },
      ]);
      service.init(canvas as unknown as Canvas);
      (service as unknown as ServicePrivate).shapeConnectors.set('old-a', ['conn-1']);
      (service as unknown as ServicePrivate).shapeConnectors.set('new', ['conn-existing']);
      (service as unknown as ServicePrivate).connectorMap.set('conn-1', {
        id: 'conn-1',
        start: { shapeId: 'old-a', portSide: 'right', x: 0, y: 0 },
        end: { portSide: 'free', x: 100, y: 0 },
        routing: 'straight',
        arrowhead: 'single',
      });
      (service as unknown as ServicePrivate).connectorMap.set('conn-existing', {
        id: 'conn-existing',
        start: { shapeId: 'new', portSide: 'left', x: 0, y: 0 },
        end: { portSide: 'free', x: -100, y: 0 },
        routing: 'straight',
        arrowhead: 'single',
      });

      service.reattachConnectors(['old-a'], 'new');

      const newConnectors = (service as unknown as ServicePrivate).shapeConnectors.get('new');
      expect(newConnectors).toContain('conn-1');
      expect(newConnectors).toContain('conn-existing');
      expect(newConnectors!.length).toBe(2);
    });

    it('detects self-loop when connector spans two merged shapes', () => {
      const canvas = makeCanvasWithObjects([
        { data: { shapeId: 'new', layerId: 'l' }, left: 0, top: 0, width: 100, height: 50, scaleX: 1, scaleY: 1 },
      ]);
      service.init(canvas as unknown as Canvas);
      (service as unknown as ServicePrivate).shapeConnectors.set('old-a', ['conn-ab']);
      (service as unknown as ServicePrivate).shapeConnectors.set('old-b', ['conn-ab']);
      (service as unknown as ServicePrivate).connectorMap.set('conn-ab', {
        id: 'conn-ab',
        start: { shapeId: 'old-a', portSide: 'right', x: 0, y: 0 },
        end: { shapeId: 'old-b', portSide: 'left', x: 100, y: 0 },
        routing: 'straight',
        arrowhead: 'single',
      });

      const result = service.reattachConnectors(['old-a', 'old-b'], 'new');

      const data = (service as unknown as ServicePrivate).connectorMap.get('conn-ab') as { start: { shapeId: string }; end: { shapeId: string } };
      expect(data.start.shapeId).toBe('new');
      expect(data.end.shapeId).toBe('new');
      expect(result.has('conn-ab')).toBe(true);
    });
  });

  describe('getEndAngleAutoRoute', () => {
    const start  = { portSide: 'right'  as const, x: 10,  y: 60 };
    const end    = { portSide: 'left'   as const, x: 210, y: 20 };
    const startV = { portSide: 'bottom' as const, x: 40,  y: 10 };
    const endV   = { portSide: 'top'    as const, x: 150, y: 70 };

    it('horizontal right→ end: returns 90 (pointing right)', () => {
      const angle = (service as unknown as ServicePrivate).getEndAngleAutoRoute(start, end);
      expect(angle).toBeCloseTo(90);
    });

    it('horizontal ←left end: returns 270 (pointing left)', () => {
      const s = { portSide: 'left'  as const, x: 210, y: 20 };
      const e = { portSide: 'right' as const, x: 10,  y: 60 };
      const angle = (service as unknown as ServicePrivate).getEndAngleAutoRoute(s, e);
      expect(angle).toBeCloseTo(270);
    });

    it('vertical down↓ end: returns 180 (pointing down)', () => {
      const angle = (service as unknown as ServicePrivate).getEndAngleAutoRoute(startV, endV);
      expect(angle).toBeCloseTo(180);
    });

    it('vertical up↑ end: returns 0 (pointing up)', () => {
      const s = { portSide: 'top'    as const, x: 150, y: 70 };
      const e = { portSide: 'bottom' as const, x: 40,  y: 10 };
      const angle = (service as unknown as ServicePrivate).getEndAngleAutoRoute(s, e);
      expect(angle).toBeCloseTo(0);
    });
  });
});
