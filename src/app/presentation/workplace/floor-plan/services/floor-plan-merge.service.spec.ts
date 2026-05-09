// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for pure-math methods in FloorPlanMergeService.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FloorPlanMergeService } from './floor-plan-merge.service';
import { FloorPlanCanvasService } from './floor-plan-canvas.service';
import { FloorPlanConnectorService } from './floor-plan-connector.service';
import { FloorPlanLayerService } from './floor-plan-layer.service';

function makeService(): FloorPlanMergeService {
  TestBed.configureTestingModule({
    providers: [
      FloorPlanMergeService,
      { provide: FloorPlanCanvasService, useValue: { beginSuppressHistory: vi.fn(), endSuppressHistory: vi.fn(), captureHistory: vi.fn(), getCanvas: vi.fn() } },
      { provide: FloorPlanConnectorService, useValue: { reattachConnectors: vi.fn().mockReturnValue(new Set()) } },
      { provide: FloorPlanLayerService, useValue: { activeLayerId: () => 'layer-1' } },
    ],
  });
  return TestBed.inject(FloorPlanMergeService);
}

describe('FloorPlanMergeService', () => {
  let service: FloorPlanMergeService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    service = makeService();
  });

  it('should instantiate', () => {
    expect(service).toBeTruthy();
  });

  describe('filterPrimitives', () => {
    it('keeps only rect, circle, polygon', () => {
      const objects = [
        { type: 'rect' },
        { type: 'circle' },
        { type: 'polygon' },
        { type: 'textbox' },
        { type: 'line' },
        { type: 'path' },
        { type: 'i-text' },
      ] as any[];
      const result = (service as any).filterPrimitives(objects);
      expect(result).toHaveLength(3);
      expect(result.map((o: any) => o.type)).toEqual(['rect', 'circle', 'polygon']);
    });

    it('returns empty array for non-primitive-only input', () => {
      const result = (service as any).filterPrimitives([{ type: 'group' }]);
      expect(result).toHaveLength(0);
    });
  });

  describe('applyMatrix', () => {
    it('applies identity matrix with translation', () => {
      const m = [1, 0, 0, 1, 50, 30];
      const result = (service as any).applyMatrix(m, 10, 20);
      expect(result).toEqual([60, 50]);
    });

    it('applies scale matrix', () => {
      const m = [2, 0, 0, 3, 0, 0];
      const result = (service as any).applyMatrix(m, 5, 4);
      expect(result).toEqual([10, 12]);
    });
  });

  describe('ringsToSvgPath', () => {
    it('generates M...L...Z path string for a single ring', () => {
      const ring: [number, number][] = [[0, 0], [100, 0], [100, 50], [0, 50], [0, 0]];
      const multiPolygon: [number, number][][][] = [[ring]];
      const result = (service as any).ringsToSvgPath(multiPolygon);
      expect(result).toBe('M 0 0 L 100 0 L 100 50 L 0 50 Z');
    });

    it('generates two sub-paths for a multi-polygon result', () => {
      const ring1: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 0]];
      const ring2: [number, number][] = [[20, 20], [30, 20], [30, 30], [20, 20]];
      const multiPolygon: [number, number][][][] = [[ring1], [ring2]];
      const result = (service as any).ringsToSvgPath(multiPolygon);
      expect(result).toContain('M 0 0');
      expect(result).toContain('M 20 20');
    });
  });

  describe('canMerge', () => {
    it('returns false when no primitives selected', () => {
      expect(service.canMerge()).toBe(false);
    });
  });
});
