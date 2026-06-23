// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';

export type FloorPlanImportType = 'svg' | 'dxf' | 'bitmap';

export interface FloorPlanImportResult {
  type: FloorPlanImportType;
  data: string;
}

interface DxfEntity {
  type: string;
  props: Record<string, string | number | { x: number; y: number }[]>;
  _nextIndex: number;
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
    const text = await this.readFileAsText(file);
    return this.dxfToSvg(text);
  }

  private dxfToSvg(dxfText: string): string {
    const lines = dxfText.split(/\r?\n/);
    const entities = this.parseDxfEntities(lines);
    const bounds = this.computeBounds(entities);
    const padding = 10;
    const minX = bounds.minX - padding;
    const minY = bounds.minY - padding;
    const width = bounds.maxX - bounds.minX + padding * 2;
    const height = bounds.maxY - bounds.minY + padding * 2;

    const svgParts: string[] = [];
    svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${-minY - height} ${width} ${height}">`);
    svgParts.push('<g transform="scale(1,-1)">');

    for (const entity of entities) {
      const svgElement = this.entityToSvg(entity);
      if (svgElement) svgParts.push(svgElement);
    }

    svgParts.push('</g>');
    svgParts.push('</svg>');
    return svgParts.join('');
  }

  private parseDxfEntities(lines: string[]): DxfEntity[] {
    const entities: DxfEntity[] = [];
    let i = 0;
    let inEntities = false;

    while (i < lines.length) {
      const code = parseInt(lines[i]?.trim() ?? '0', 10);
      const value = lines[i + 1]?.trim() ?? '';
      i += 2;

      if (code === 0 && value === 'SECTION') {
        const nextCode = parseInt(lines[i]?.trim() ?? '0', 10);
        const nextValue = lines[i + 1]?.trim() ?? '';
        if (nextCode === 2 && nextValue === 'ENTITIES') {
          inEntities = true;
          i += 2;
        }
      } else if (code === 0 && value === 'ENDSEC') {
        inEntities = false;
      } else if (inEntities && code === 0 && value) {
        const entity = this.parseEntity(value, lines, i);
        if (entity) {
          entities.push(entity);
          i = entity._nextIndex;
        }
      }
    }

    return entities;
  }

  private parseEntity(type: string, lines: string[], startIndex: number): DxfEntity | null {
    const props: Record<string, string | number> = { type };
    let i = startIndex;

    while (i < lines.length) {
      const codeStr = lines[i]?.trim() ?? '';
      const code = parseInt(codeStr, 10);
      const value = lines[i + 1]?.trim() ?? '';

      if (codeStr === '' || isNaN(code)) {
        i += 1;
        continue;
      }

      if (code === 0) break;

      const numValue = parseFloat(value);
      props[`_${code}`] = isNaN(numValue) || value === '' ? value : numValue;
      i += 2;
    }

    if (type === 'LWPOLYLINE') {
      return this.parseLwPolyline(props, lines, i);
    }

    return { type, props, _nextIndex: i } as DxfEntity;
  }

  private parseLwPolyline(baseProps: Record<string, string | number>, lines: string[], startIndex: number): DxfEntity | null {
    const points: { x: number; y: number }[] = [];
    let i = startIndex;
    let x: number | null = null;
    const expectedCount = typeof baseProps['_90'] === 'number' ? baseProps['_90'] : Infinity;

    while (i < lines.length && points.length < expectedCount) {
      const codeStr = lines[i]?.trim() ?? '';
      const code = parseInt(codeStr, 10);
      const value = lines[i + 1]?.trim() ?? '';

      if (codeStr === '' || isNaN(code)) {
        i += 1;
        continue;
      }

      if (code === 0) break;

      if (code === 10) {
        x = parseFloat(value);
      } else if (code === 20 && x !== null) {
        points.push({ x, y: parseFloat(value) });
        x = null;
      } else {
        const numValue = parseFloat(value);
        baseProps[`_${code}`] = isNaN(numValue) || value === '' ? value : numValue;
      }

      i += 2;
    }

    return { type: 'LWPOLYLINE', props: { ...baseProps, points }, _nextIndex: i } as DxfEntity;
  }

  private entityToSvg(entity: DxfEntity): string | null {
    const p = entity.props;

    switch (entity.type) {
      case 'LINE': {
        const x1 = p['_10'] as number ?? 0;
        const y1 = p['_20'] as number ?? 0;
        const x2 = p['_11'] as number ?? 0;
        const y2 = p['_21'] as number ?? 0;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="1" />`;
      }
      case 'CIRCLE': {
        const cx = p['_10'] as number ?? 0;
        const cy = p['_20'] as number ?? 0;
        const r = p['_40'] as number ?? 0;
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="black" stroke-width="1" />`;
      }
      case 'ARC': {
        const cx = p['_10'] as number ?? 0;
        const cy = p['_20'] as number ?? 0;
        const r = p['_40'] as number ?? 0;
        const startAngle = (p['_50'] as number ?? 0) * (Math.PI / 180);
        const endAngle = (p['_51'] as number ?? 0) * (Math.PI / 180);
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
        const sweep = endAngle > startAngle ? 1 : 0;
        return `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}" fill="none" stroke="black" stroke-width="1" />`;
      }
      case 'LWPOLYLINE': {
        const pts = p['points'] as { x: number; y: number }[] ?? [];
        if (pts.length < 2) return null;
        const isClosed = (p['_70'] as number ?? 0) & 1;
        const d = pts.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ') + (isClosed ? ' Z' : '');
        return `<path d="${d}" fill="none" stroke="black" stroke-width="1" />`;
      }
      case 'TEXT':
      case 'MTEXT': {
        const x = p['_10'] as number ?? 0;
        const y = p['_20'] as number ?? 0;
        const text = String(p['_1'] ?? '').replace(/[<>]/g, '');
        const size = (p['_40'] as number ?? 10);
        if (!text) return null;
        return `<text x="${x}" y="${y}" font-size="${size}" fill="black">${text}</text>`;
      }
      default:
        return null;
    }
  }

  private computeBounds(entities: DxfEntity[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const entity of entities) {
      const p = entity.props;
      switch (entity.type) {
        case 'LINE': {
          const coords = [p['_10'], p['_20'], p['_11'], p['_21']];
          for (let i = 0; i < coords.length; i += 2) {
            const x = coords[i] as number ?? 0;
            const y = coords[i + 1] as number ?? 0;
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          }
          break;
        }
        case 'CIRCLE':
        case 'ARC': {
          const cx = p['_10'] as number ?? 0;
          const cy = p['_20'] as number ?? 0;
          const r = p['_40'] as number ?? 0;
          minX = Math.min(minX, cx - r); maxX = Math.max(maxX, cx + r);
          minY = Math.min(minY, cy - r); maxY = Math.max(maxY, cy + r);
          break;
        }
        case 'LWPOLYLINE': {
          const pts = p['points'] as { x: number; y: number }[] ?? [];
          for (const pt of pts) {
            minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x);
            minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y);
          }
          break;
        }
        case 'TEXT':
        case 'MTEXT': {
          const x = p['_10'] as number ?? 0;
          const y = p['_20'] as number ?? 0;
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          break;
        }
      }
    }

    if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    return { minX, minY, maxX, maxY };
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
