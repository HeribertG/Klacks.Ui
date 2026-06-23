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
import { FabricWithData } from './floor-plan-object-data.interface';

export interface PathNode {
  command: 'M' | 'L' | 'C' | 'Q';
  x: number;
  y: number;
  cp1?: { x: number; y: number };
  cp2?: { x: number; y: number };
}

const ANCHOR_RADIUS = 7;
const CONTROL_RADIUS = 5;
const SEGMENT_HANDLE_RADIUS = 5;
const ANCHOR_COLOR = '#2563eb';
const CONTROL_COLOR = '#f59e0b';
const SEGMENT_HANDLE_COLOR = '#dc2626';
const KAPPA = 0.5522847498;
const MIN_NODES_FOR_DELETE = 2;
const CLOSING_SEGMENT_INDEX = -1;

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
    const po: { x: number; y: number } = (obj as Polygon & { pathOffset: { x: number; y: number } }).pathOffset ?? { x: 0, y: 0 };
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
    const po: { x: number; y: number } = (obj as Path & { pathOffset: { x: number; y: number } }).pathOffset ?? { x: 0, y: 0 };
    const cmds = (obj as Path & { path: (string | number)[][] }).path;
    const nodes: PathNode[] = [];
    let isClosed = false;
    for (const cmd of cmds) {
      switch (cmd[0] as string) {
        case 'M': nodes.push({ command: 'M', ...applyWithOffset(cmd[1] as number, cmd[2] as number, po) }); break;
        case 'L': nodes.push({ command: 'L', ...applyWithOffset(cmd[1] as number, cmd[2] as number, po) }); break;
        case 'C': nodes.push({ command: 'C', cp1: applyWithOffset(cmd[1] as number, cmd[2] as number, po), cp2: applyWithOffset(cmd[3] as number, cmd[4] as number, po), ...applyWithOffset(cmd[5] as number, cmd[6] as number, po) }); break;
        case 'Q': nodes.push({ command: 'Q', cp1: applyWithOffset(cmd[1] as number, cmd[2] as number, po), ...applyWithOffset(cmd[3] as number, cmd[4] as number, po) }); break;
        case 'Z': isClosed = true; break;
      }
    }
    return { nodes, isClosed };
  }

  if (obj instanceof Line) {
    const x1 = (obj as Line & { x1: number; y1: number; x2: number; y2: number }).x1 ?? 0;
    const y1 = (obj as Line & { x1: number; y1: number; x2: number; y2: number }).y1 ?? 0;
    const x2 = (obj as Line & { x1: number; y1: number; x2: number; y2: number }).x2 ?? 0;
    const y2 = (obj as Line & { x1: number; y1: number; x2: number; y2: number }).y2 ?? 0;
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

  enterEditMode(obj: FabricObject): void {
    if (!this.canvas) return;
    if (this._isInEditMode()) this.exitEditMode();

    const isConvertible =
      obj instanceof Rect || obj instanceof Circle || obj instanceof Polygon ||
      obj instanceof Path || obj instanceof Line;
    if (!isConvertible) return;

    const { nodes, isClosed } = shapeToNodes(obj);
    if (nodes.length < 2) return;

    const fill = obj.fill ?? 'transparent';
    const stroke = obj.stroke ?? '#000000';
    const strokeWidth = obj.strokeWidth ?? 2;
    this.originalShapeId = (obj as FabricWithData).data?.shapeId ?? null;

    this.canvasService.beginSuppressHistory();
    this._isConverting = true;
    this.canvas.remove(obj);
    this._isConverting = false;

    const svgString = nodesToSvgString(nodes, isClosed);
    const newPath = new Path(svgString, { fill, stroke, strokeWidth, objectCaching: false, selectable: false, evented: false });
    newPath.set('data', { shapeId: this.originalShapeId ?? crypto.randomUUID() });
    this.canvas.add(newPath);
    this.canvasService.endSuppressHistory();

    this.nodes = nodes;
    this.isClosed = isClosed;
    this.editingPath = newPath;
    this._isInEditMode.set(true);
    this._selectedNodeIndex.set(null);

    this.spawnHandles();
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  exitEditMode(): void {
    if (!this.canvas || !this._isInEditMode()) return;

    this.clearHandles();
    this.canvas.discardActiveObject();

    if (this.editingPath && this.nodes.length >= 2) {
      const svgString = nodesToSvgString(this.nodes, this.isClosed);
      const fill = this.editingPath.fill ?? 'transparent';
      const stroke = this.editingPath.stroke ?? '#000000';
      const strokeWidth = this.editingPath.strokeWidth ?? 2;
      const shapeId = (this.editingPath as FabricWithData).data?.shapeId ?? crypto.randomUUID();

      this._isConverting = true;
      this.canvas.remove(this.editingPath);
      this._isConverting = false;

      const finalPath = new Path(svgString, { fill, stroke, strokeWidth, objectCaching: false });
      finalPath.set('data', { shapeId });
      this.canvas.add(finalPath);
      this.canvas.setActiveObject(finalPath);

      if (this.originalShapeId) {
        this.connectorService.onShapeMoved(this.originalShapeId);
      }
    }

    this.canvasService.captureHistory();
    this.nodes = [];
    this.isClosed = false;
    this.editingPath = null;
    this.originalShapeId = null;
    this._isInEditMode.set(false);
    this._selectedNodeIndex.set(null);
    this.canvas.renderAll();
  }

  deleteSelectedNode(): void {
    if (!this.canvas || !this._isInEditMode()) return;
    const activeObj = this.canvas.getActiveObject();
    const data = (activeObj as FabricWithData)?.data;
    if (!data?.isPointHandle) return;

    if (data.isSegmentHandle) {
      this.deleteSegment(data.segmentEndNodeIndex as number);
      return;
    }

    if (!data.isAnchor) return;
    const nodeIndex = data.nodeIndex as number;
    const updated = deleteNode(this.nodes, nodeIndex);
    if (updated === this.nodes) return;

    this.nodes = updated;
    this._selectedNodeIndex.set(null);
    this.canvas.discardActiveObject();
    this.rebuildPath();
    this.spawnHandles();
    this.canvas.renderAll();
  }

  private deleteSegment(endNodeIndex: number): void {
    if (!this.canvas) return;

    if (endNodeIndex === CLOSING_SEGMENT_INDEX) {
      if (!this.isClosed) return;
      this.isClosed = false;
    } else {
      if (endNodeIndex <= 0 || endNodeIndex >= this.nodes.length) return;
      if (this.nodes[endNodeIndex].command === 'M') return;

      if (this.isClosed) {
        this.rotateAndOpenPath(endNodeIndex);
      } else if (endNodeIndex === 1) {
        const newStart = this.nodes[1];
        this.nodes.splice(1, 1);
        this.nodes[0] = { command: 'M', x: newStart.x, y: newStart.y };
      } else if (endNodeIndex === this.nodes.length - 1) {
        this.nodes.splice(endNodeIndex, 1);
      } else {
        const node = this.nodes[endNodeIndex];
        this.nodes[endNodeIndex] = { command: 'M', x: node.x, y: node.y };
      }
    }

    this._selectedNodeIndex.set(null);
    this.canvas.discardActiveObject();
    this.rebuildPath();
    this.spawnHandles();
    this.canvas.renderAll();
  }

  private rotateAndOpenPath(splitIndex: number): void {
    const n = this.nodes.length;
    const newNodes: PathNode[] = [];

    newNodes.push({ command: 'M', x: this.nodes[splitIndex].x, y: this.nodes[splitIndex].y });

    for (let i = splitIndex + 1; i < n; i++) {
      newNodes.push({ ...this.nodes[i] });
    }

    const lastNode = newNodes[newNodes.length - 1];
    const firstOriginal = this.nodes[0];
    const needsWrapAround =
      Math.abs(lastNode.x - firstOriginal.x) > 0.01 ||
      Math.abs(lastNode.y - firstOriginal.y) > 0.01;

    if (needsWrapAround) {
      newNodes.push({ command: 'L', x: firstOriginal.x, y: firstOriginal.y });
    }

    for (let i = 1; i < splitIndex; i++) {
      newNodes.push({ ...this.nodes[i] });
    }

    this.nodes = newNodes;
    this.isClosed = false;
  }

  onHandleMoved(handle: FabricObject): void {
    if (!this.canvas) return;
    const data = (handle as FabricWithData).data;
    if (!data?.isPointHandle) return;
    if (data.isSegmentHandle) return;

    const newX = handle.left ?? 0;
    const newY = handle.top ?? 0;
    const nodeIndex = data.nodeIndex as number;

    if (data.isAnchor) {
      const dx = newX - this.nodes[nodeIndex].x;
      const dy = newY - this.nodes[nodeIndex].y;
      const node = this.nodes[nodeIndex];
      this.nodes[nodeIndex] = {
        ...node,
        x: newX,
        y: newY,
        cp1: node.cp1 ? { x: node.cp1.x + dx, y: node.cp1.y + dy } : undefined,
        cp2: node.cp2 ? { x: node.cp2.x + dx, y: node.cp2.y + dy } : undefined,
      };
    } else {
      const cpIndex = data.cpIndex as 0 | 1;
      const node = this.nodes[nodeIndex];
      if (cpIndex === 0) {
        this.nodes[nodeIndex] = { ...node, cp1: { x: newX, y: newY } };
      } else {
        this.nodes[nodeIndex] = { ...node, cp2: { x: newX, y: newY } };
      }
    }

    this.updateStems();
  }

  onHandleModified(handle: FabricObject): void {
    if ((handle as FabricWithData).data?.isSegmentHandle) return;
    this.rebuildPath();
    this.canvas?.renderAll();
  }

  private spawnHandles(): void {
    if (!this.canvas) return;
    this.clearHandles();

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];

      const anchor = new Circle({
        left: node.x,
        top: node.y,
        radius: ANCHOR_RADIUS,
        fill: ANCHOR_COLOR,
        stroke: '#ffffff',
        strokeWidth: 1.5,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        hasBorders: false,
        hasControls: false,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
      });
      anchor.set('data', { isPointHandle: true, isAnchor: true, nodeIndex: i });
      this.canvas.add(anchor);
      this.handleObjects.push(anchor);

      if (node.command === 'C' || node.command === 'Q') {
        this.spawnControlHandle(i, node.cp1!, 0);
        this.spawnStem(node.x, node.y, node.cp1!.x, node.cp1!.y);
      }
      if (node.command === 'C') {
        this.spawnControlHandle(i, node.cp2!, 1);
        this.spawnStem(node.x, node.y, node.cp2!.x, node.cp2!.y);
      }
    }

    for (let i = 1; i < this.nodes.length; i++) {
      if (this.nodes[i].command === 'M') continue;
      const prev = this.nodes[i - 1];
      const curr = this.nodes[i];
      this.spawnSegmentHandle((prev.x + curr.x) / 2, (prev.y + curr.y) / 2, i);
    }
    if (this.isClosed && this.nodes.length >= 2) {
      const first = this.nodes[0];
      const last = this.nodes[this.nodes.length - 1];
      this.spawnSegmentHandle((first.x + last.x) / 2, (first.y + last.y) / 2, CLOSING_SEGMENT_INDEX);
    }
  }

  private spawnControlHandle(nodeIndex: number, pt: { x: number; y: number }, cpIndex: 0 | 1): void {
    if (!this.canvas) return;
    const handle = new Circle({
      left: pt.x,
      top: pt.y,
      radius: CONTROL_RADIUS,
      fill: CONTROL_COLOR,
      stroke: '#ffffff',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true,
      hasBorders: false,
      hasControls: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
    });
    handle.set('data', { isPointHandle: true, isAnchor: false, nodeIndex, cpIndex });
    this.canvas.add(handle);
    this.handleObjects.push(handle);
  }

  private spawnSegmentHandle(x: number, y: number, segmentEndNodeIndex: number): void {
    if (!this.canvas) return;
    const handle = new Circle({
      left: x,
      top: y,
      radius: SEGMENT_HANDLE_RADIUS,
      fill: 'transparent',
      stroke: SEGMENT_HANDLE_COLOR,
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true,
      hasBorders: false,
      hasControls: false,
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      opacity: 0.8,
    });
    handle.set('data', { isPointHandle: true, isSegmentHandle: true, segmentEndNodeIndex });
    this.canvas.add(handle);
    this.handleObjects.push(handle);
  }

  private spawnStem(ax: number, ay: number, cx: number, cy: number): void {
    if (!this.canvas) return;
    const stem = new Line([ax, ay, cx, cy], {
      stroke: '#9ca3af',
      strokeWidth: 1,
      strokeDashArray: [4, 3],
      selectable: false,
      evented: false,
      objectCaching: false,
    });
    stem.set('data', { isPointStem: true });
    this.canvas.add(stem);
    this.stemObjects.push(stem);
  }

  private clearHandles(): void {
    if (!this.canvas) return;
    for (const h of this.handleObjects) this.canvas.remove(h);
    for (const s of this.stemObjects) this.canvas.remove(s);
    this.handleObjects = [];
    this.stemObjects = [];
  }

  private rebuildPath(): void {
    if (!this.canvas || !this.editingPath) return;
    const svgString = nodesToSvgString(this.nodes, this.isClosed);
    const fill = this.editingPath.fill ?? 'transparent';
    const stroke = this.editingPath.stroke ?? '#000000';
    const strokeWidth = this.editingPath.strokeWidth ?? 2;
    const shapeId = (this.editingPath as FabricWithData).data?.shapeId ?? crypto.randomUUID();

    this.canvasService.beginSuppressHistory();
    this._isConverting = true;
    this.canvas.remove(this.editingPath);
    this._isConverting = false;

    const newPath = new Path(svgString, { fill, stroke, strokeWidth, objectCaching: false, selectable: false, evented: false });
    newPath.set('data', { shapeId });
    this.canvas.add(newPath);
    this.editingPath = newPath;
    this.canvasService.endSuppressHistory();
  }

  private updateStems(): void {
    if (!this.canvas) return;
    for (const s of this.stemObjects) this.canvas.remove(s);
    this.stemObjects = [];
    for (const node of this.nodes) {
      if (node.cp1) this.spawnStem(node.x, node.y, node.cp1.x, node.cp1.y);
      if (node.cp2) this.spawnStem(node.x, node.y, node.cp2.x, node.cp2.y);
    }
  }
}
