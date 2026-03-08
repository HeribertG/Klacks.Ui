// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { FloorPlanCanvasService } from './floor-plan-canvas.service';

@Injectable()
export class FloorPlanExportService {
  private canvasService = inject(FloorPlanCanvasService);

  exportSVG(): void {
    const svg = this.canvasService.toSVG();
    this.downloadFile(svg, 'floor-plan.svg', 'image/svg+xml');
  }

  exportPNG(): void {
    const dataUrl = this.canvasService.toDataURL();
    this.downloadFile(dataUrl, 'floor-plan.png', 'image/png');
  }

  exportJSON(): void {
    const json = this.canvasService.toJSON();
    this.downloadFile(json, 'floor-plan.json', 'application/json');
  }

  private downloadFile(data: string, filename: string, mimeType: string): void {
    const isDataUrl = data.startsWith('data:');
    const href = isDataUrl ? data : `data:${mimeType};charset=utf-8,${encodeURIComponent(data)}`;
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
