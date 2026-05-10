// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for the bezier point editor: converts shapes to Path, renders draggable
 * anchor and control-handle circles, and rebuilds the path after edits.
 * @param canvas - Fabric.js Canvas instance provided via init(canvas)
 * @param canvasService - FloorPlanCanvasService for history suppression
 */

import { Injectable, signal, Signal, inject } from '@angular/core';
import {
  Canvas,
  FabricObject,
  Path,
  Polygon,
  Rect,
  Circle,
  Line,
} from 'fabric';
import { FloorPlanCanvasService } from './floor-plan-canvas.service';
import { FloorPlanConnectorService } from './floor-plan-connector.service';

export interface PathNode {
  command: 'M' | 'L' | 'C' | 'Q';
  x: number;
  y: number;
  cp1?: { x: number; y: number };
  cp2?: { x: number; y: number };
}

const ANCHOR_RADIUS = 7;
const CONTROL_RADIUS = 5;
const ANCHOR_COLOR = '#2563eb';
const ANCHOR_SELECTED_COLOR = '#ef4444';
const CONTROL_COLOR = '#f59e0b';
const KAPPA = 0.5522847498;
const MIN_NODES_FOR_DELETE = 2;

export function nodesToSvgString(nodes: PathNode[], isClosed: boolean): string {
  const fmt = (v: number) => parseFloat(v.toFixed(3)).toString();
  const parts = nodes.map((node) => {
    switch (node.command) {
      case 'M': return `M ${fmt(node.x)} ${fmt(node.y)}`;
      case 'L': return `L ${fmt(node.x)} ${fmt(node.y)}`;
      case 'C': return `C ${fmt(node.cp1!.x)} ${fmt(node.cp1!.y)} ${fmt(node.cp2!.x)} ${fmt(node.cp2!.y)} ${fmt(node.x)} ${fmt(node.y)}`;
      case 'Q': return `Q ${fmt(node.cp1!.x)} ${fmt(node.cp1!.y)} ${fmt(node.x)} ${fmt(node.y)}`;
    }
  });
  if (isClosed) parts.push('Z');
  return parts.join(' ');
}

export function deleteNode(nodes: PathNode[], index: number): PathNode[] {
  if (nodes.length <= MIN_NODES_FOR_DELETE) return nodes;
  const result = [...nodes];
  result.splice(index, 1);
  if (index === 0 && result.length > 0) {
    result[0] = { ...result[0], command: 'M' };
  }
  return result;
}

export function shapeToNodes(obj: FabricObject): { nodes: PathNode[]; isClosed: boolean } {
  const m = obj.calcTransformMatrix() as number[];
  const apply = (lx: number, ly: number) => ({
    x: m[0] * lx + m[2] * ly + m[4],
    y: m[1] * lx + m[3] * ly + m[5],
  });
  const applyWithOffset = (lx: number, ly: number, po: { x: number; y: number }) => ({
    x: m[0] * (lx - po.x) + m[2] * (ly - po.y) + m[4],
    y: m[1] * (lx - po.x) + m[3] * (ly - po.y) + m[5],
  });

  if (obj instanceof Rect) {
    const hw = obj.width / 2;
    const hh = obj.height / 2;
    return {
      nodes: [
        { command: 'M', ...apply(-hw, -hh) },
        { command: 'L', ...apply(hw, -hh) },
        { command: 'L', ...apply(hw, hh) },
        { command: 'L', ...apply(-hw, hh) },
      ],
      isClosed: true,
    };
  }

  if (obj instanceof Circle) {
    const r = obj.radius;
    const k = KAPPA * r;
    const top = apply(0, -r);
    const right = apply(r, 0);
    const bottom = apply(0, r);
    const left = apply(-r, 0);
    return {
      nodes: [
        { command: 'M', ...top },
        { command: 'C', cp1: apply(k, -r), cp2: apply(r, -k), ...right },
        { command: 'C', cp1: apply(r, k), cp2: apply(k, r), ...bottom },
        { command: 'C', cp1: apply(-k, r), cp2: apply(-r, k), ...left },
        { command: 'C', cp1: apply(-r, -k), cp2: apply(-k, -r), ...top },
      ],
      isClosed: true,
    };
  }

  if (obj instanceof Polygon) {
    const po: { x: number; y: number } = (obj as any).pathOffset ?? { x: 0, y: 0 };
    const pts = obj.points ?? [];
    if (pts.length === 0) return { nodes: [], isClosed: false };
    return {
      nodes: [
        { command: 'M', ...applyWithOffset(pts[0].x, pts[0].y, po) },
        ...pts.slice(1).map((p) => ({ command: 'L' as const, ...applyWithOffset(p.x, p.y, po) })),
      ],
      isClosed: true,
    };
  }

  if (obj instanceof Path) {
    const po: { x: number; y: number } = (obj as any).pathOffset ?? { x: 0, y: 0 };
    const cmds = (obj as any).path as any[][];
    const nodes: PathNode[] = [];
    let isClosed = false;
    for (const cmd of cmds) {
      switch (cmd[0]) {
        case 'M': nodes.push({ command: 'M', ...applyWithOffset(cmd[1], cmd[2], po) }); break;
        case 'L': nodes.push({ command: 'L', ...applyWithOffset(cmd[1], cmd[2], po) }); break;
        case 'C': nodes.push({ command: 'C', cp1: applyWithOffset(cmd[1], cmd[2], po), cp2: applyWithOffset(cmd[3], cmd[4], po), ...applyWithOffset(cmd[5], cmd[6], po) }); break;
        case 'Q': nodes.push({ command: 'Q', cp1: applyWithOffset(cmd[1], cmd[2], po), ...applyWithOffset(cmd[3], cmd[4], po) }); break;
        case 'Z': isClosed = true; break;
      }
    }
    return { nodes, isClosed };
  }

  if (obj instanceof Line) {
    const x1 = (obj as any).x1 ?? 0;
    const y1 = (obj as any).y1 ?? 0;
    const x2 = (obj as any).x2 ?? 0;
    const y2 = (obj as any).y2 ?? 0;
    const po = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    return {
      nodes: [
        { command: 'M', ...applyWithOffset(x1, y1, po) },
        { command: 'L', ...applyWithOffset(x2, y2, po) },
      ],
      isClosed: false,
    };
  }

  return { nodes: [], isClosed: false };
}

@Injectable()
export class FloorPlanPointEditorService {
  private readonly canvasService = inject(FloorPlanCanvasService);
  private readonly connectorService = inject(FloorPlanConnectorService);

  private canvas: Canvas | null = null;
  private nodes: PathNode[] = [];
  private isClosed = false;
  private editingPath: Path | null = null;
  private handleObjects: FabricObject[] = [];
  private stemObjects: Line[] = [];
  private originalShapeId: string | null = null;

  private readonly _isInEditMode = signal(false);
  private readonly _selectedNodeIndex = signal<number | null>(null);

  private _isConverting = false;

  readonly isInEditMode: Signal<boolean> = this._isInEditMode.asReadonly();
  readonly selectedNodeIndex: Signal<number | null> = this._selectedNodeIndex.asReadonly();

  get isConverting(): boolean {
    return this._isConverting;
  }

  init(canvas: Canvas): void {
    this.canvas = canvas;
  }

  enterEditMode(_obj: FabricObject): void { /* implemented in Task 4 */ }
  exitEditMode(): void { /* implemented in Task 4 */ }
  deleteSelectedNode(): void { /* implemented in Task 4 */ }
  onHandleMoved(_handle: FabricObject): void { /* implemented in Task 4 */ }
  onHandleModified(_handle: FabricObject): void { /* implemented in Task 4 */ }
}

export { ANCHOR_RADIUS, CONTROL_RADIUS, ANCHOR_COLOR, ANCHOR_SELECTED_COLOR, CONTROL_COLOR };
