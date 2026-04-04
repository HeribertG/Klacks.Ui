// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';

export type FloorPlanImportType = 'svg' | 'dxf' | 'bitmap';

export interface FloorPlanImportResult {
  type: FloorPlanImportType;
  data: string;
}

const SUPPORTED_SVG_TYPES = ['image/svg+xml'];
const SUPPORTED_BITMAP_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'];

@Injectable()
export class FloorPlanImportService {
  async importSVG(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read SVG file'));
      reader.readAsText(file);
    });
  }

  async importDXF(file: File): Promise<string> {
    const _text = await this.readFileAsText(file);

    const svgParts: string[] = [];
    svgParts.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">');
    svgParts.push(`<text x="10" y="20" font-size="14">DXF: ${file.name}</text>`);
    svgParts.push('</svg>');
    return svgParts.join('');
  }

  async importBitmap(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read bitmap file'));
      reader.readAsDataURL(file);
    });
  }

  async importFile(file: File): Promise<FloorPlanImportResult> {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (SUPPORTED_SVG_TYPES.includes(file.type) || extension === 'svg') {
      const data = await this.importSVG(file);
      return { type: 'svg', data };
    }

    if (extension === 'dxf') {
      const data = await this.importDXF(file);
      return { type: 'dxf', data };
    }

    if (SUPPORTED_BITMAP_TYPES.includes(file.type)) {
      const data = await this.importBitmap(file);
      return { type: 'bitmap', data };
    }

    throw new Error(`Unsupported file type: ${file.type || extension}`);
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}
