// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for pure-math methods in FloorPlanConnectorService.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FloorPlanConnectorService } from './floor-plan-connector.service';

function mockShape(left: number, top: number, width: number, height: number): any {
  return { left, top, width, height, scaleX: 1, scaleY: 1 };
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
      const result = (service as any).getPortCoords(shape, 'right');
      expect(result).toEqual({ x: 100, y: 25 });
    });

    it('returns left port at center-left', () => {
      const shape = mockShape(20, 10, 100, 50);
      const result = (service as any).getPortCoords(shape, 'left');
      expect(result).toEqual({ x: 20, y: 35 });
    });

    it('returns top port at center-top', () => {
      const shape = mockShape(0, 0, 100, 50);
      const result = (service as any).getPortCoords(shape, 'top');
      expect(result).toEqual({ x: 50, y: 0 });
    });

    it('returns bottom port at center-bottom', () => {
      const shape = mockShape(0, 0, 100, 50);
      const result = (service as any).getPortCoords(shape, 'bottom');
      expect(result).toEqual({ x: 50, y: 50 });
    });

    it('respects scaleX and scaleY', () => {
      const shape = { left: 0, top: 0, width: 100, height: 50, scaleX: 2, scaleY: 2 };
      const result = (service as any).getPortCoords(shape, 'right');
      expect(result).toEqual({ x: 200, y: 50 });
    });
  });

  describe('getDefaultControlPoint', () => {
    it('places control point at horizontal midpoint, 60px above minimum y', () => {
      const result = (service as any).getDefaultControlPoint(0, 100, 200, 100);
      expect(result).toEqual({ x: 100, y: 40 });
    });
  });

  function makeCanvasWithObjects(objects: any[]): any {
    return {
      getObjects: () => objects,
      add: vi.fn(),
      remove: vi.fn(),
      renderAll: vi.fn(),
    };
  }

  describe('getPortNear', () => {
    it('returns null when canvas is not initialized', () => {
      expect(service.getPortNear(50, 50)).toBeNull();
    });

    it('returns null when no shape is within PORT_HIT_RADIUS', () => {
      const shape = { data: { shapeId: 'abc' }, left: 0, top: 0, width: 100, height: 50, scaleX: 1, scaleY: 1 };
      (service as any).canvas = makeCanvasWithObjects([shape]);
      expect(service.getPortNear(200, 200)).toBeNull();
    });

    it('returns nearest PortHit when within 20px of a port', () => {
      const shape = { data: { shapeId: 'abc' }, left: 0, top: 0, width: 100, height: 50, scaleX: 1, scaleY: 1 };
      (service as any).canvas = makeCanvasWithObjects([shape]);
      const hit = service.getPortNear(110, 25);
      expect(hit).not.toBeNull();
      expect(hit!.shapeId).toBe('abc');
      expect(hit!.portSide).toBe('right');
      expect(hit!.x).toBe(100);
      expect(hit!.y).toBe(25);
    });

    it('returns null when point is exactly at PORT_HIT_RADIUS boundary (21px away)', () => {
      const shape = { data: { shapeId: 'abc' }, left: 0, top: 0, width: 100, height: 50, scaleX: 1, scaleY: 1 };
      (service as any).canvas = makeCanvasWithObjects([shape]);
      expect(service.getPortNear(121, 25)).toBeNull();
    });

    it('skips objects with data.isConnector', () => {
      const connector = { data: { shapeId: 'abc', isConnector: true }, left: 0, top: 0, width: 100, height: 50, scaleX: 1, scaleY: 1 };
      (service as any).canvas = makeCanvasWithObjects([connector]);
      expect(service.getPortNear(100, 25)).toBeNull();
    });

    it('skips objects without data.shapeId', () => {
      const noId = { data: {}, left: 0, top: 0, width: 100, height: 50, scaleX: 1, scaleY: 1 };
      (service as any).canvas = makeCanvasWithObjects([noId]);
      expect(service.getPortNear(100, 25)).toBeNull();
    });
  });

  describe('hidePortIndicators', () => {
    it('removes only objects with data.isPortIndicator', () => {
      const indicator = { data: { isPortIndicator: true } };
      const shape = { data: { shapeId: 'abc' } };
      const mockCanvas = makeCanvasWithObjects([indicator, shape]);
      (service as any).canvas = mockCanvas;
      service.hidePortIndicators();
      expect(mockCanvas.remove).toHaveBeenCalledWith(indicator);
      expect(mockCanvas.remove).not.toHaveBeenCalledWith(shape);
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('does nothing when canvas is null', () => {
      expect(() => service.hidePortIndicators()).not.toThrow();
    });
  });
});
