// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for exporting the floor plan canvas to SVG, PNG, JSON, or the system print dialog.
 */

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

  printCurrentPage(svgContent: string, orientation: 'landscape' | 'portrait'): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svgElement = this.extractSvgElement(svgContent);
    const pageRule = `@page { size: A4 ${orientation}; margin: 0; }`;
    const styles = `${pageRule} body { margin: 0; padding: 0; } svg { width: 100vw; height: 100vh; display: block; }`;

    printWindow.document.write(
      `<!DOCTYPE html><html><head><style>${styles}</style></head><body>${svgElement}</body></html>`,
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  private extractSvgElement(rawSvg: string): string {
    const start = rawSvg.indexOf('<svg');
    return start >= 0 ? rawSvg.slice(start) : rawSvg;
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
