// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Computes magnetic anchor-point snapping during shape dragging.
 * Finds the nearest anchor pair (dragged ↔ target) within the snap threshold
 * and returns the position offset to apply. Manages a single highlight indicator.
 * @param SNAP_THRESHOLD - pixel radius within which anchor snap activates
 */

import { Injectable } from '@angular/core';
import { Canvas, Circle, FabricObject } from 'fabric';
import { FabricWithData } from './floor-plan-object-data.interface';

const SNAP_THRESHOLD = 15;
const HIGHLIGHT_RADIUS = 6;
const HIGHLIGHT_FILL = '#f59e0b';
const HIGHLIGHT_STROKE = '#ffffff';
const HIGHLIGHT_STROKE_WIDTH = 1.5;

interface AnchorPoint {
  x: number;
  y: number;
}

export interface AnchorSnapResult {
  offsetX: number;
  offsetY: number;
  targetPoint: AnchorPoint;
}

@Injectable()
export class FloorPlanAnchorSnapService {
  private _highlight: Circle | null = null;

  findSnap(draggedObj: FabricObject, canvas: Canvas): AnchorSnapResult | null {
    const draggedAnchors = this.getAnchorPoints(draggedObj);
    let bestDist = SNAP_THRESHOLD;
    let best: AnchorSnapResult | null = null;

    for (const obj of canvas.getObjects()) {
      if (obj === draggedObj) continue;
      if (this.isInternalObject(obj)) continue;

      const targetAnchors = this.getAnchorPoints(obj);
      for (const da of draggedAnchors) {
        for (const ta of targetAnchors) {
          const dist = Math.sqrt((da.x - ta.x) ** 2 + (da.y - ta.y) ** 2);
          if (dist < bestDist) {
            bestDist = dist;
            best = { offsetX: ta.x - da.x, offsetY: ta.y - da.y, targetPoint: ta };
          }
        }
      }
    }

    return best;
  }

  showHighlight(canvas: Canvas, point: AnchorPoint): void {
    if (!this._highlight) {
      this._highlight = new Circle({
        radius: HIGHLIGHT_RADIUS,
        fill: HIGHLIGHT_FILL,
        stroke: HIGHLIGHT_STROKE,
        strokeWidth: HIGHLIGHT_STROKE_WIDTH,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      this._highlight.set('data', { isAnchorHighlight: true });
      canvas.add(this._highlight);
    }
    this._highlight.set({ left: point.x, top: point.y });
    canvas.bringObjectToFront(this._highlight);
    canvas.renderAll();
  }

  hideHighlight(canvas: Canvas): void {
    if (this._highlight) {
      canvas.remove(this._highlight);
      this._highlight = null;
      canvas.renderAll();
    }
  }

  private getAnchorPoints(obj: FabricObject): AnchorPoint[] {
    const r = obj.getBoundingRect();
    const l = r.left;
    const t = r.top;
    const w = r.width;
    const h = r.height;
    return [
      { x: l,         y: t         },
      { x: l + w,     y: t         },
      { x: l,         y: t + h     },
      { x: l + w,     y: t + h     },
      { x: l + w / 2, y: t         },
      { x: l + w / 2, y: t + h     },
      { x: l,         y: t + h / 2 },
      { x: l + w,     y: t + h / 2 },
    ];
  }

  private isInternalObject(obj: FabricObject): boolean {
    const data = (obj as FabricWithData).data;
    if (!data) return false;
    return !!(
      data.isConnector ||
      data.isPortIndicator ||
      data.isPointHandle ||
      data.isEndpointHandle ||
      data.isMidpointHandle ||
      data.isAnchorHighlight ||
      data.markerId ||
      data.liveMarker
    );
  }
}
