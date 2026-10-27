// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Creates new shapes, text and images on the floor plan canvas and toggles free drawing.
 * New objects get a fresh shape id, are snapped to the grid, assigned to the active layer and selected.
 * @param canvasService - Owner of the Fabric.js canvas and of the active-layer assignment
 * @param toolService - Grid snapping applied to positions and sizes of new objects
 */

import { Injectable, inject } from '@angular/core';
import { Rect, Circle, Line, Textbox, FabricImage, PencilBrush, Polygon } from 'fabric';
import { FloorPlanCanvasService } from './floor-plan-canvas.service';
import { FloorPlanToolService } from './floor-plan-tool.service';

const DEFAULT_REGULAR_POLYGON_RADIUS = 60;

@Injectable()
export class FloorPlanShapeService {
  private readonly canvasService = inject(FloorPlanCanvasService);
  private readonly toolService = inject(FloorPlanToolService);

  addRect(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const rect = new Rect({
      left: this.toolService.snap(100),
      top: this.toolService.snap(100),
      width: this.toolService.snap(120),
      height: this.toolService.snap(80),
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
    });
    rect.set('data', { shapeId: crypto.randomUUID() });
    this.canvasService.assignToActiveLayer(rect);
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  }

  addCircle(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const circle = new Circle({
      left: this.toolService.snap(100),
      top: this.toolService.snap(100),
      radius: this.toolService.snap(50),
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
    });
    circle.set('data', { shapeId: crypto.randomUUID() });
    this.canvasService.assignToActiveLayer(circle);
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
  }

  addLine(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const snap = (value: number): number => this.toolService.snap(value);
    const line = new Line([snap(50), snap(50), snap(200), snap(50)], {
      stroke: '#000000',
      strokeWidth: 2,
    });
    line.set('data', { shapeId: crypto.randomUUID() });
    this.canvasService.assignToActiveLayer(line);
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();
  }

  addText(text: string): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const textbox = new Textbox(text, {
      left: this.toolService.snap(100),
      top: this.toolService.snap(100),
      fontSize: 16,
      fill: '#000000',
      width: this.toolService.snap(200),
    });
    textbox.set('data', { shapeId: crypto.randomUUID() });
    this.canvasService.assignToActiveLayer(textbox);
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.renderAll();
  }

  addRegularPolygonAt(sides: number, cx: number, cy: number): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const snappedCx = this.toolService.snap(cx);
    const snappedCy = this.toolService.snap(cy);
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (2 * Math.PI * i / sides) - Math.PI / 2;
      points.push({
        x: snappedCx + DEFAULT_REGULAR_POLYGON_RADIUS * Math.cos(angle),
        y: snappedCy + DEFAULT_REGULAR_POLYGON_RADIUS * Math.sin(angle),
      });
    }
    const polygon = new Polygon(points, {
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
    });
    polygon.set('data', { shapeId: crypto.randomUUID() });
    this.canvasService.assignToActiveLayer(polygon);
    canvas.add(polygon);
    canvas.setActiveObject(polygon);
    canvas.renderAll();
  }

  addPolygon(points: { x: number; y: number }[]): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const snap = (value: number): number => this.toolService.snap(value);
    const snappedPoints = points.map((p) => ({ x: snap(p.x), y: snap(p.y) }));
    const polygon = new Polygon(snappedPoints, {
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
    });
    polygon.set('data', { shapeId: crypto.randomUUID() });
    this.canvasService.assignToActiveLayer(polygon);
    canvas.add(polygon);
    canvas.setActiveObject(polygon);
    canvas.renderAll();
  }

  async addImage(url: string): Promise<void> {
    if (!this.canvasService.getCanvas()) return;
    const img = await FabricImage.fromURL(url);
    img.set({ left: this.toolService.snap(100), top: this.toolService.snap(100) });
    img.set('data', { shapeId: crypto.randomUUID() });
    this.canvasService.assignToActiveLayer(img);
    const canvas = this.canvasService.getCanvas()!;
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
  }

  async addImageFromFile(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    await this.addImage(url);
  }

  enableFreeDrawing(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = '#000000';
    canvas.freeDrawingBrush.width = 2;
  }

  disableFreeDrawing(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    canvas.isDrawingMode = false;
  }
}
