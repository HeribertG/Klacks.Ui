// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for merging selected primitive shapes (Rect, Circle, Polygon) into a single
 * Path object using boolean union. Tracks canvas selection and exposes canMerge signal.
 * @param canvas - Fabric.js Canvas instance provided via init(canvas)
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { Canvas, FabricObject, Rect, Circle, Polygon, Path } from 'fabric';
import polygonClipping, { MultiPolygon } from 'polygon-clipping';
import { FloorPlanCanvasService } from './floor-plan-canvas.service';
import { FloorPlanConnectorService } from './floor-plan-connector.service';
import { FloorPlanLayerService } from './floor-plan-layer.service';

const MERGE_CIRCLE_POINTS = 64;
const MERGEABLE_TYPES = new Set(['rect', 'circle', 'polygon']);

@Injectable()
export class FloorPlanMergeService {
  private readonly canvasService = inject(FloorPlanCanvasService);
  private readonly connectorService = inject(FloorPlanConnectorService);
  private readonly layerService = inject(FloorPlanLayerService);

  private readonly _selectedPrimitives = signal<FabricObject[]>([]);

  readonly canMerge = computed(() => this._selectedPrimitives().length >= 2);

  init(canvas: Canvas): void {
    canvas.on('selection:created', (e) => {
      this._selectedPrimitives.set(this.filterPrimitives(e.selected ?? []));
    });
    canvas.on('selection:updated', (e) => {
      this._selectedPrimitives.set(this.filterPrimitives(e.selected ?? []));
    });
    canvas.on('selection:cleared', () => {
      this._selectedPrimitives.set([]);
    });
  }

  private filterPrimitives(objects: FabricObject[]): FabricObject[] {
    return objects.filter((obj) => MERGEABLE_TYPES.has((obj as any).type ?? ''));
  }

  private applyMatrix(m: number[], x: number, y: number): [number, number] {
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  }

  private getWorldPoints(obj: FabricObject): [number, number][] {
    const m = obj.calcTransformMatrix();
    const apply = (x: number, y: number): [number, number] =>
      this.applyMatrix(m, x, y);

    if (obj instanceof Rect) {
      const hw = obj.width / 2;
      const hh = obj.height / 2;
      return [apply(-hw, -hh), apply(hw, -hh), apply(hw, hh), apply(-hw, hh)];
    }
    if (obj instanceof Circle) {
      const r = obj.radius;
      const pts: [number, number][] = [];
      for (let i = 0; i < MERGE_CIRCLE_POINTS; i++) {
        const θ = (2 * Math.PI * i) / MERGE_CIRCLE_POINTS;
        pts.push(apply(r * Math.cos(θ), r * Math.sin(θ)));
      }
      return pts;
    }
    if (obj instanceof Polygon) {
      return (obj.points ?? []).map((pt) => apply(pt.x, pt.y));
    }
    return [];
  }

  private pointsToClosedRing(pts: [number, number][]): [number, number][] {
    if (pts.length === 0) return [];
    return [...pts, pts[0]];
  }

  private ringsToSvgPath(multiPolygon: [number, number][][][]): string {
    return multiPolygon
      .flatMap((polygon) => polygon)
      .map(
        (ring) =>
          'M ' +
          ring
            .slice(0, -1)
            .map(([x, y]) => `${x} ${y}`)
            .join(' L ') +
          ' Z'
      )
      .join(' ');
  }

  mergeSelected(): void {
    const primitives = this._selectedPrimitives();
    if (primitives.length < 2) return;

    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    const allObjects = canvas.getObjects();
    const sorted = [...primitives].sort(
      (a, b) => allObjects.indexOf(a) - allObjects.indexOf(b)
    );
    const styleSource = sorted[0];

    const fill = (styleSource as any).fill ?? 'transparent';
    const stroke = (styleSource as any).stroke ?? '#000000';
    const strokeWidth = (styleSource as any).strokeWidth ?? 2;

    const polys: MultiPolygon[] = primitives.map((obj) => {
      const pts = this.getWorldPoints(obj);
      return [[this.pointsToClosedRing(pts)]];
    });

    let unionResult: MultiPolygon;
    try {
      const [subject, ...clippings] = polys;
      unionResult = polygonClipping.union(subject, ...clippings);
    } catch {
      return;
    }

    if (unionResult.length === 0) return;

    const svgPath = this.ringsToSvgPath(unionResult as [number, number][][][]);
    const newShapeId = crypto.randomUUID();
    const activeLayerId = this.layerService.activeLayerId();

    const path = new Path(svgPath, {
      fill,
      stroke,
      strokeWidth,
      objectCaching: false,
    });
    path.set('data', { shapeId: newShapeId, layerId: activeLayerId });

    const oldShapeIds = primitives
      .map((obj) => (obj as any).data?.shapeId as string | undefined)
      .filter((id): id is string => Boolean(id));

    this.canvasService.beginSuppressHistory();
    try {
      canvas.discardActiveObject();
      for (const obj of primitives) {
        canvas.remove(obj);
      }
      canvas.add(path);
      canvas.setActiveObject(path);
    } finally {
      this.canvasService.endSuppressHistory();
    }

    const transferred = this.connectorService.reattachConnectors(oldShapeIds, newShapeId);
    const selfLoopIds = [...transferred].filter((connId) => {
      const connMap = (this.connectorService as any).connectorMap as Map<string, { start: { shapeId?: string }; end: { shapeId?: string } }> | undefined;
      const data = connMap?.get(connId);
      return data?.start.shapeId === newShapeId && data?.end.shapeId === newShapeId;
    });
    for (const connId of selfLoopIds) {
      this.connectorService.deleteConnector(connId);
    }

    this.canvasService.captureHistory();
    canvas.renderAll();
    this._selectedPrimitives.set([]);
  }
}
