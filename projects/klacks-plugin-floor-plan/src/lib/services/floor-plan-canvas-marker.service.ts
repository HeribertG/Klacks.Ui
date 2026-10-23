// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Draws markers on the floor plan canvas: editable work markers (text boxes carrying shift/work/client data,
 * extractable for saving) and read-only live markers laid out in a grid with optional photo or placeholder.
 * @param canvasService - Owner of the Fabric.js canvas and of the active-layer assignment
 * @param floorPlanId - Floor plan the extracted work markers belong to (extractWorkMarkers)
 */

import { Injectable, inject } from '@angular/core';
import { Circle, FabricImage, Path, Rect, Textbox } from 'fabric';
import { IFloorPlanWorkMarker } from '@floor-plan-plugin/domain/models/floor-plan-work-marker.interface';
import { FloorPlanMarkerType } from '@floor-plan-plugin/domain/enums/floor-plan-marker-type.enum';
import { FloorPlanCanvasService } from './floor-plan-canvas.service';
import { ILiveMarkerEntry } from './live-marker-entry.interface';
import { FabricWithData } from './fabric-with-data.type';

const LIVE_MARKER_COLS = 5;
const LIVE_MARKER_PAD_X = 50;
const LIVE_MARKER_PAD_Y = 50;
const LIVE_MARKER_STEP_X = 160;
const LIVE_MARKER_STEP_Y = 110;
const LIVE_MARKER_WIDTH = 140;
const LIVE_MARKER_FONT_SIZE = 11;
const LIVE_MARKER_IMAGE_SIZE = 40;
const LIVE_MARKER_SPACING = 4;
const LIVE_MARKER_INNER_PAD = 4;

@Injectable()
export class FloorPlanCanvasMarkerService {
  private readonly canvasService = inject(FloorPlanCanvasService);

  renderWorkMarkers(markers: IFloorPlanWorkMarker[]): void {
    if (!this.canvasService.getCanvas()) return;
    this.removeWorkMarkersFromCanvas();

    for (const marker of markers) {
      this.addWorkMarker(marker);
    }
  }

  addWorkMarker(marker: IFloorPlanWorkMarker): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    const lines: string[] = [];
    if (marker.clientName) lines.push(marker.clientName);
    if (marker.abbreviation) lines.push(marker.abbreviation);
    if (marker.startTime || marker.endTime) {
      lines.push(`${marker.startTime ?? ''} - ${marker.endTime ?? ''}`);
    }
    if (lines.length === 0 && marker.label) lines.push(marker.label);
    if (lines.length === 0) lines.push('Marker');

    const text = lines.join('\n');
    const fillColor = marker.color || '#000000';
    const bgColor = marker.color ? this.hexToRgba(marker.color, 0.15) : '#ffffff80';

    const textbox = new Textbox(text, {
      left: marker.x,
      top: marker.y,
      width: marker.width || 120,
      fontSize: 12,
      fill: fillColor,
      backgroundColor: bgColor,
      stroke: fillColor,
      strokeWidth: 1,
    });

    textbox.set('data', {
      markerId: marker.id,
      markerType: marker.markerType,
      shiftId: marker.shiftId,
      workId: marker.workId,
      clientId: marker.clientId,
      clientName: marker.clientName,
      abbreviation: marker.abbreviation,
      startTime: marker.startTime,
      endTime: marker.endTime,
      fromDate: marker.fromDate,
      untilDate: marker.untilDate,
    });
    this.canvasService.assignToActiveLayer(textbox);
    canvas.add(textbox);
    canvas.renderAll();
  }

  extractWorkMarkers(floorPlanId: string): IFloorPlanWorkMarker[] {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return [];

    return canvas.getObjects()
      .filter((obj) => {
        const data = (obj as FabricWithData).data;
        return data !== undefined && 'markerId' in data;
      })
      .map((obj) => {
        const data = (obj as FabricWithData).data!;
        return {
          id: data.markerId || undefined,
          floorPlanId,
          shiftId: data.shiftId,
          workId: data.workId,
          clientId: data.clientId,
          clientName: data.clientName,
          abbreviation: data.abbreviation,
          startTime: data.startTime,
          endTime: data.endTime,
          fromDate: data.fromDate,
          untilDate: data.untilDate,
          x: obj.left ?? 0,
          y: obj.top ?? 0,
          width: obj.width ?? 120,
          height: obj.height ?? 50,
          color: (obj.fill as string) || '#000000',
          label: (obj as Textbox).text || '',
          markerType: data.markerType ?? FloorPlanMarkerType.Work,
        } as IFloorPlanWorkMarker;
      });
  }

  removeWorkMarkersFromCanvas(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const markerObjects = canvas.getObjects().filter((obj) => {
      const data = (obj as FabricWithData).data;
      return data !== undefined && 'markerId' in data;
    });
    markerObjects.forEach((obj) => canvas.remove(obj));
    canvas.renderAll();
  }

  renderLiveMarkers(entries: ILiveMarkerEntry[]): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    this.clearLiveMarkers();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const left = LIVE_MARKER_PAD_X + (i % LIVE_MARKER_COLS) * LIVE_MARKER_STEP_X;
      const top = LIVE_MARKER_PAD_Y + Math.floor(i / LIVE_MARKER_COLS) * LIVE_MARKER_STEP_Y;
      this.addLiveMarkerGroup(entry, left, top, i);
    }

    canvas.renderAll();
  }

  clearLiveMarkers(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const liveObjects = canvas.getObjects().filter((obj) => {
      const data = (obj as FabricWithData).data;
      return data !== undefined && data.liveMarker === true;
    });
    liveObjects.forEach((obj) => canvas.remove(obj));
    canvas.renderAll();
  }

  private addLiveMarkerGroup(entry: ILiveMarkerEntry, left: number, top: number, index: number): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    const fillColor = entry.color || '#2563eb';
    const bgColor = this.hexToRgba(fillColor, 0.15);
    let cursorY = top;

    if (entry.display.image) {
      this.addLiveMarkerImage(entry.imageDataUrl, fillColor, left, cursorY, index);
      cursorY += LIVE_MARKER_IMAGE_SIZE + LIVE_MARKER_SPACING;
    }

    const textLines = this.buildLiveMarkerTextLines(entry);
    if (textLines.length === 0) return;

    const textbox = new Textbox(textLines.join('\n'), {
      left,
      top: cursorY,
      width: LIVE_MARKER_WIDTH,
      fontSize: LIVE_MARKER_FONT_SIZE,
      fill: fillColor,
      backgroundColor: bgColor,
      stroke: fillColor,
      strokeWidth: 1,
      padding: LIVE_MARKER_INNER_PAD,
      selectable: false,
      evented: false,
    });
    textbox.set('data', { liveMarker: true, index });
    canvas.add(textbox);
  }

  private buildLiveMarkerTextLines(entry: ILiveMarkerEntry): string[] {
    const lines: string[] = [];
    if (entry.display.name && entry.clientName) lines.push(entry.clientName);
    if (entry.display.time && (entry.startTime || entry.endTime)) {
      lines.push(`${entry.startTime ?? ''} - ${entry.endTime ?? ''}`);
    }
    if (entry.display.phone && entry.phone) lines.push(entry.phone);
    return lines;
  }

  private addLiveMarkerImage(
    imageDataUrl: string | null,
    accentColor: string,
    left: number,
    top: number,
    index: number,
  ): void {
    if (!this.canvasService.getCanvas()) return;
    if (imageDataUrl) {
      const html = document.createElement('img');
      html.onload = () => {
        const naturalWidth = html.naturalWidth || LIVE_MARKER_IMAGE_SIZE;
        const fabricImg = new FabricImage(html, {
          left,
          top,
          selectable: false,
          evented: false,
        });
        fabricImg.scale(LIVE_MARKER_IMAGE_SIZE / naturalWidth);
        fabricImg.set('data', { liveMarker: true, index, isMarkerImage: true });
        const canvas = this.canvasService.getCanvas();
        canvas?.add(fabricImg);
        canvas?.renderAll();
      };
      html.src = imageDataUrl;
      return;
    }
    this.addPersonPlaceholder(accentColor, left, top, index);
  }

  private addPersonPlaceholder(accentColor: string, left: number, top: number, index: number): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const size = LIVE_MARKER_IMAGE_SIZE;
    const background = new Rect({
      left,
      top,
      width: size,
      height: size,
      fill: this.hexToRgba(accentColor, 0.18),
      stroke: accentColor,
      strokeWidth: 1,
      rx: 4,
      ry: 4,
      selectable: false,
      evented: false,
    });
    background.set('data', { liveMarker: true, index, isMarkerPlaceholder: true });
    canvas.add(background);

    const head = new Circle({
      left: left + size * 0.32,
      top: top + size * 0.18,
      radius: size * 0.16,
      fill: accentColor,
      selectable: false,
      evented: false,
    });
    head.set('data', { liveMarker: true, index, isMarkerPlaceholder: true });
    canvas.add(head);

    const body = new Path(
      `M ${left + size * 0.18} ${top + size * 0.86} C ${left + size * 0.18} ${top + size * 0.6}, ${left + size * 0.82} ${top + size * 0.6}, ${left + size * 0.82} ${top + size * 0.86} Z`,
      {
        fill: accentColor,
        selectable: false,
        evented: false,
      },
    );
    body.set('data', { liveMarker: true, index, isMarkerPlaceholder: true });
    canvas.add(body);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
