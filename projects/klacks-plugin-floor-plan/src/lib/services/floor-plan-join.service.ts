// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for joining 2+ selected Path/Polygon objects into a single closed Path
 * using a greedy nearest-endpoint chaining algorithm.
 * @param canvas - Fabric.js Canvas instance provided via init(canvas)
 * @param canvasService - FloorPlanCanvasService for history suppression
 */

import { Injectable, signal, computed, Signal, inject } from '@angular/core';
import { Canvas, FabricObject, Path, Polygon } from 'fabric';
import { FloorPlanCanvasService } from './floor-plan-canvas.service';

interface JoinNode {
  command: 'M' | 'L' | 'C' | 'Q';
  x: number;
  y: number;
  cp1?: { x: number; y: number };
  cp2?: { x: number; y: number };
}

interface JoinItem {
  obj: FabricObject;
  nodes: JoinNode[];
  isClosed: boolean;
}

const CONNECTOR_STROKE_COLOR = '#374151';
const CONNECTOR_STROKE_WIDTH = 2;

// ─── Pure math exports (tested) ──────────────────────────────────────────────

export function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function reverseNodes(nodes: JoinNode[]): JoinNode[] {
  if (nodes.length < 2) return [...nodes];
  const result: JoinNode[] = [];
  result.push({ command: 'M', x: nodes[nodes.length - 1].x, y: nodes[nodes.length - 1].y });
  for (let i = nodes.length - 1; i >= 1; i--) {
    const node = nodes[i];
    const prevX = nodes[i - 1].x;
    const prevY = nodes[i - 1].y;
    switch (node.command) {
      case 'M':
        break;
      case 'L':
        result.push({ command: 'L', x: prevX, y: prevY });
        break;
      case 'C':
        result.push({ command: 'C', cp1: node.cp2, cp2: node.cp1, x: prevX, y: prevY });
        break;
      case 'Q':
        result.push({ command: 'Q', cp1: node.cp1, x: prevX, y: prevY });
        break;
    }
  }
  return result;
}

export function buildGreedyChain(items: JoinItem[]): JoinItem[] {
  if (items.length === 0) return [];
  const remaining = [...items];
  const chain: JoinItem[] = [remaining.splice(0, 1)[0]];

  while (remaining.length > 0) {
    const chainEnd = chain[chain.length - 1].nodes[chain[chain.length - 1].nodes.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    let bestReversed = false;

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      const startPt = item.nodes[0];
      const endPt = item.nodes[item.nodes.length - 1];
      const dStart = dist(chainEnd, startPt);
      const dEnd = dist(chainEnd, endPt);
      if (dStart < bestDist) { bestDist = dStart; bestIdx = i; bestReversed = false; }
      if (dEnd < bestDist) { bestDist = dEnd; bestIdx = i; bestReversed = true; }
    }

    const chosen = remaining.splice(bestIdx, 1)[0];
    chain.push(bestReversed ? { ...chosen, nodes: reverseNodes(chosen.nodes) } : chosen);
  }

  return chain;
}

export function buildJoinedSvg(chain: JoinItem[]): string {
  const fmt = (v: number) => parseFloat(v.toFixed(3)).toString();
  const parts: string[] = [];

  for (let ci = 0; ci < chain.length; ci++) {
    const { nodes } = chain[ci];
    for (let ni = 0; ni < nodes.length; ni++) {
      const node = nodes[ni];
      if (ci === 0 && ni === 0) {
        parts.push(`M ${fmt(node.x)} ${fmt(node.y)}`);
        continue;
      }
      if (ni === 0) {
        parts.push(`L ${fmt(node.x)} ${fmt(node.y)}`);
        continue;
      }
      switch (node.command) {
        case 'M': break;
        case 'L': parts.push(`L ${fmt(node.x)} ${fmt(node.y)}`); break;
        case 'C': parts.push(`C ${fmt(node.cp1!.x)} ${fmt(node.cp1!.y)} ${fmt(node.cp2!.x)} ${fmt(node.cp2!.y)} ${fmt(node.x)} ${fmt(node.y)}`); break;
        case 'Q': parts.push(`Q ${fmt(node.cp1!.x)} ${fmt(node.cp1!.y)} ${fmt(node.x)} ${fmt(node.y)}`); break;
      }
    }
  }

  parts.push('Z');
  return parts.join(' ');
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class FloorPlanJoinService {
  private canvas: Canvas | null = null;
  private readonly canvasService = inject(FloorPlanCanvasService);
  private readonly _joinableSelection = signal<FabricObject[]>([]);

  readonly canJoin: Signal<boolean> = computed(() => this._joinableSelection().length >= 2);

  init(canvas: Canvas): void {
    this.canvas = canvas;
    canvas.on('selection:created', (e) => this._joinableSelection.set(this.filterJoinable(e.selected ?? [])));
    canvas.on('selection:updated', (e) => this._joinableSelection.set(this.filterJoinable(e.selected ?? [])));
    canvas.on('selection:cleared', () => this._joinableSelection.set([]));
  }

  private filterJoinable(objects: FabricObject[]): FabricObject[] {
    return objects.filter((o) => o instanceof Path || o instanceof Polygon);
  }

  joinSelected(): void {
    if (!this.canvas) return;
    const selection = this._joinableSelection();
    if (selection.length < 2) return;

    const items: JoinItem[] = selection.map((obj) => this.toJoinItem(obj));
    const chain = buildGreedyChain(items);
    const svgString = buildJoinedSvg(chain);

    const styleSource = selection[0];
    const newPath = new Path(svgString, {
      fill: styleSource.fill ?? 'transparent',
      stroke: styleSource.stroke ?? CONNECTOR_STROKE_COLOR,
      strokeWidth: styleSource.strokeWidth ?? CONNECTOR_STROKE_WIDTH,
      objectCaching: false,
    });
    newPath.set('data', { shapeId: crypto.randomUUID() });

    this.canvasService.beginSuppressHistory();
    this.canvas.discardActiveObject();
    for (const obj of selection) {
      this.canvas.remove(obj);
    }
    this.canvas.add(newPath);
    this.canvas.setActiveObject(newPath);
    this.canvas.renderAll();
    this._joinableSelection.set([]);
    this.canvasService.captureHistory();
  }

  private toJoinItem(obj: FabricObject): JoinItem {
    if (obj instanceof Polygon) return this.polygonToJoinItem(obj);
    if (obj instanceof Path) return this.pathToJoinItem(obj);
    return { obj, nodes: [], isClosed: false };
  }

  private polygonToJoinItem(poly: Polygon): JoinItem {
    const m = poly.calcTransformMatrix() as number[];
    const po: { x: number; y: number } = (poly as Polygon & { pathOffset: { x: number; y: number } }).pathOffset ?? { x: 0, y: 0 };
    const toC = (lx: number, ly: number) => ({
      x: m[0] * (lx - po.x) + m[2] * (ly - po.y) + m[4],
      y: m[1] * (lx - po.x) + m[3] * (ly - po.y) + m[5],
    });
    const pts = poly.points ?? [];
    const nodes: JoinNode[] = pts.length === 0 ? [] : [
      { command: 'M', ...toC(pts[0].x, pts[0].y) },
      ...pts.slice(1).map((p) => ({ command: 'L' as const, ...toC(p.x, p.y) })),
    ];
    return { obj: poly, nodes, isClosed: true };
  }

  private pathToJoinItem(path: Path): JoinItem {
    const m = path.calcTransformMatrix() as number[];
    const po: { x: number; y: number } = (path as Path & { pathOffset: { x: number; y: number } }).pathOffset ?? { x: 0, y: 0 };
    const toC = (lx: number, ly: number) => ({
      x: m[0] * (lx - po.x) + m[2] * (ly - po.y) + m[4],
      y: m[1] * (lx - po.x) + m[3] * (ly - po.y) + m[5],
    });
    const cmds = (path as Path & { path: (string | number)[][] }).path;
    const nodes: JoinNode[] = [];
    let isClosed = false;
    for (const cmd of cmds) {
      switch (cmd[0] as string) {
        case 'M': nodes.push({ command: 'M', ...toC(cmd[1] as number, cmd[2] as number) }); break;
        case 'L': nodes.push({ command: 'L', ...toC(cmd[1] as number, cmd[2] as number) }); break;
        case 'C': nodes.push({ command: 'C', cp1: toC(cmd[1] as number, cmd[2] as number), cp2: toC(cmd[3] as number, cmd[4] as number), ...toC(cmd[5] as number, cmd[6] as number) }); break;
        case 'Q': nodes.push({ command: 'Q', cp1: toC(cmd[1] as number, cmd[2] as number), ...toC(cmd[3] as number, cmd[4] as number) }); break;
        case 'Z': isClosed = true; break;
      }
    }
    return { obj: path, nodes, isClosed };
  }
}
