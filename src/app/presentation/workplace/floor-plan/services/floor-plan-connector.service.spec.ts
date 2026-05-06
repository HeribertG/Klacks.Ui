// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for pure-math methods in FloorPlanConnectorService.
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
});
