// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Visual styling of the selected floor plan object: stroke, fill, opacity, text formatting,
 * shadow and gradient fill. Stroke colour and width also update the free drawing brush.
 * @param canvasService - Owner of the Fabric.js canvas and of the undo history
 */

import { Injectable, inject } from '@angular/core';
import { FabricObject, Gradient, Shadow, Textbox } from 'fabric';
import { FloorPlanCanvasService } from './floor-plan-canvas.service';

const TEXT_OBJECT_TYPES = ['textbox', 'i-text', 'text'];
const DEFAULT_GRADIENT_EXTENT = 100;
const MIN_FONT_SIZE = 1;

@Injectable()
export class FloorPlanObjectStyleService {
  private readonly canvasService = inject(FloorPlanCanvasService);

  applyStrokeColor(color: string): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) {
      obj.set('stroke', color);
      canvas.renderAll();
    }
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color;
    }
  }

  applyFillColor(color: string): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) {
      obj.set('fill', color);
      canvas.renderAll();
    }
  }

  applyStrokeWidth(width: number): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) {
      obj.set('strokeWidth', width);
      canvas.renderAll();
    }
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = width;
    }
  }

  applyOpacity(opacity: number): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) {
      obj.set('opacity', opacity);
      canvas.renderAll();
    }
  }

  applyFontFamily(family: string): void {
    this.applyTextProperty('fontFamily', family);
  }

  applyFontSize(size: number): void {
    this.applyTextProperty('fontSize', Math.max(MIN_FONT_SIZE, size));
  }

  applyBold(bold: boolean): void {
    this.applyTextProperty('fontWeight', bold ? 'bold' : 'normal');
  }

  applyItalic(italic: boolean): void {
    this.applyTextProperty('fontStyle', italic ? 'italic' : 'normal');
  }

  applyUnderline(underline: boolean): void {
    this.applyTextProperty('underline', underline);
  }

  applyLinethrough(linethrough: boolean): void {
    this.applyTextProperty('linethrough', linethrough);
  }

  applyTextAlign(align: string): void {
    this.applyTextProperty('textAlign', align);
  }

  applyTextColor(color: string): void {
    this.applyTextProperty('fill', color);
  }

  applyObjectShadow(enabled: boolean, color: string, blur: number, offsetX: number, offsetY: number): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set('shadow', enabled ? new Shadow({ color, blur, offsetX, offsetY }) : null);
    canvas.renderAll();
    this.canvasService.saveHistory();
  }

  applyGradientFill(enabled: boolean, color1: string, color2: string, direction: string): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    if (!enabled) {
      obj.set('fill', color1);
      canvas.renderAll();
      this.canvasService.saveHistory();
      return;
    }
    const w = (obj.width ?? DEFAULT_GRADIENT_EXTENT) * (obj.scaleX ?? 1);
    const h = (obj.height ?? DEFAULT_GRADIENT_EXTENT) * (obj.scaleY ?? 1);
    const hw = w / 2;
    const hh = h / 2;
    const colorStops = [{ offset: 0, color: color1 }, { offset: 1, color: color2 }];
    if (direction === 'radial') {
      obj.set('fill', new Gradient({
        type: 'radial',
        coords: { r1: 0, r2: Math.max(hw, hh), x1: 0, y1: 0, x2: 0, y2: 0 },
        colorStops,
      }));
    } else {
      const coords =
        direction === 'vertical'    ? { x1: 0, y1: -hh, x2: 0, y2: hh } :
        direction === 'diagonal-down' ? { x1: -hw, y1: -hh, x2: hw, y2: hh } :
        direction === 'diagonal-up'   ? { x1: -hw, y1: hh, x2: hw, y2: -hh } :
                                        { x1: -hw, y1: 0, x2: hw, y2: 0 };
      obj.set('fill', new Gradient({ type: 'linear', coords, colorStops }));
    }
    canvas.renderAll();
    this.canvasService.saveHistory();
  }

  private applyTextProperty(key: string, value: string | number | boolean): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj || !this.isTextObject(obj)) return;
    (obj as Textbox).set(key, value);
    canvas.renderAll();
    this.canvasService.saveHistory();
  }

  private isTextObject(obj: FabricObject): boolean {
    return TEXT_OBJECT_TYPES.includes(obj.type);
  }
}
