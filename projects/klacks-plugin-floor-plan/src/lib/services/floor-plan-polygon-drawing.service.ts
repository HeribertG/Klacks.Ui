// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Click-by-click polygon drawing on the floor plan canvas: collects snapped points, shows a preview
 * polyline that follows the mouse and turns the points into a polygon when finished.
 * @param canvasService - Owner of the Fabric.js canvas the preview is drawn on
 * @param toolService - Grid snapping applied to every point
 * @param shapeService - Creates the final polygon
 */

import { Injectable, inject } from '@angular/core';
import { Polyline } from 'fabric';
import { FloorPlanCanvasService } from './floor-plan-canvas.service';
import { FloorPlanToolService } from './floor-plan-tool.service';
import { FloorPlanShapeService } from './floor-plan-shape.service';

const MIN_POLYGON_POINTS = 3;
const PREVIEW_MIN_POINTS = 2;

@Injectable()
export class FloorPlanPolygonDrawingService {
  private readonly canvasService = inject(FloorPlanCanvasService);
  private readonly toolService = inject(FloorPlanToolService);
  private readonly shapeService = inject(FloorPlanShapeService);

  private polygonPoints: { x: number; y: number }[] = [];
  private tempPolyline: Polyline | null = null;
  private isPolygonDrawing = false;

  startPolygonDrawing(): void {
    this.isPolygonDrawing = true;
    this.polygonPoints = [];
    this.tempPolyline = null;
  }

  isInPolygonDrawingMode(): boolean {
    return this.isPolygonDrawing;
  }

  addPolygonPoint(x: number, y: number): void {
    if (!this.canvasService.getCanvas() || !this.isPolygonDrawing) return;
    this.polygonPoints.push({ x: this.toolService.snap(x), y: this.toolService.snap(y) });
    this.refreshPolygonPreview();
  }

  updatePolygonPreview(x: number, y: number): void {
    if (!this.canvasService.getCanvas() || !this.isPolygonDrawing || this.polygonPoints.length === 0) return;
    this.refreshPolygonPreview(this.toolService.snap(x), this.toolService.snap(y));
  }

  finishPolygonDrawing(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas || !this.isPolygonDrawing || this.polygonPoints.length < MIN_POLYGON_POINTS) {
      this.cancelPolygonDrawing();
      return;
    }

    if (this.tempPolyline) {
      canvas.remove(this.tempPolyline);
    }

    this.shapeService.addPolygon(this.polygonPoints);
    this.cancelPolygonDrawing();
  }

  cancelPolygonDrawing(): void {
    const canvas = this.canvasService.getCanvas();
    this.isPolygonDrawing = false;
    if (this.tempPolyline && canvas) {
      canvas.remove(this.tempPolyline);
    }
    this.tempPolyline = null;
    this.polygonPoints = [];
    canvas?.renderAll();
  }

  private refreshPolygonPreview(mouseX?: number, mouseY?: number): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    if (this.tempPolyline) {
      canvas.remove(this.tempPolyline);
    }

    const points = [...this.polygonPoints];
    if (mouseX !== undefined && mouseY !== undefined) {
      points.push({ x: mouseX, y: mouseY });
    }

    if (points.length >= PREVIEW_MIN_POINTS) {
      this.tempPolyline = new Polyline(points, {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      canvas.add(this.tempPolyline);
    }

    canvas.renderAll();
  }
}
