// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service managing connector creation, sticky shape attachment, and path rendering on the floor plan canvas.
 * @param canvas - Fabric.js Canvas instance provided via init(canvas)
 */

import { Injectable } from '@angular/core';
import { Canvas, Path, Triangle, Circle, FabricObject } from 'fabric';
import { ConnectorRoutingType, ConnectorArrowheadType } from './floor-plan-tool.service';

export type PortSide = 'left' | 'right' | 'top' | 'bottom';

export interface PortHit {
  shapeId: string;
  portSide: PortSide;
  x: number;
  y: number;
}

interface ConnectorEndpoint {
  shapeId?: string;
  portSide: PortSide | 'free';
  x: number;
  y: number;
}

interface ConnectorData {
  id: string;
  start: ConnectorEndpoint;
  end: ConnectorEndpoint;
  routing: ConnectorRoutingType;
  arrowhead: ConnectorArrowheadType;
  controlPoint?: { x: number; y: number };
}

const PORT_HIT_RADIUS = 20;
const ARROWHEAD_SIZE = 14;
const MIDPOINT_HANDLE_RADIUS = 6;
const ENDPOINT_HANDLE_RADIUS = 5;
const PORT_INDICATOR_RADIUS = 5;
const MIDPOINT_HANDLE_COLOR = '#f59e0b';
const ENDPOINT_HANDLE_COLOR = '#2563eb';
const PORT_INDICATOR_COLOR = '#2563eb';

@Injectable()
export class FloorPlanConnectorService {
  private canvas: Canvas | null = null;
  private connectorMap = new Map<string, ConnectorData>();
  private shapeConnectors = new Map<string, string[]>();

  init(canvas: Canvas): void {
    this.canvas = canvas;
    this.connectorMap.clear();
    this.shapeConnectors.clear();
  }

  private getPortCoords(obj: FabricObject, side: PortSide): { x: number; y: number } {
    const scaleX = (obj as any).scaleX ?? 1;
    const scaleY = (obj as any).scaleY ?? 1;
    const w = ((obj as any).width ?? 0) * scaleX;
    const h = ((obj as any).height ?? 0) * scaleY;
    const l = (obj as any).left ?? 0;
    const t = (obj as any).top ?? 0;
    switch (side) {
      case 'right':  return { x: l + w,       y: t + h / 2 };
      case 'left':   return { x: l,            y: t + h / 2 };
      case 'top':    return { x: l + w / 2,    y: t };
      case 'bottom': return { x: l + w / 2,    y: t + h };
    }
  }

  getPortNear(x: number, y: number): PortHit | null {
    if (!this.canvas) return null;
    const sides: PortSide[] = ['left', 'right', 'top', 'bottom'];
    let best: PortHit | null = null;
    let bestDist = PORT_HIT_RADIUS;

    for (const obj of this.canvas.getObjects()) {
      const data = (obj as any).data;
      if (!data?.shapeId || data.isConnector || data.isPortIndicator) continue;

      for (const side of sides) {
        const port = this.getPortCoords(obj, side);
        const dist = Math.sqrt((port.x - x) ** 2 + (port.y - y) ** 2);
        if (dist < bestDist) {
          bestDist = dist;
          best = { shapeId: data.shapeId, portSide: side, x: port.x, y: port.y };
        }
      }
    }
    return best;
  }

  showPortIndicators(shapeId: string): void {
    if (!this.canvas) return;
    this.hidePortIndicators();

    const target = this.canvas.getObjects().find(
      (obj) => (obj as any).data?.shapeId === shapeId && !(obj as any).data?.isConnector
    );
    if (!target) return;

    const sides: PortSide[] = ['left', 'right', 'top', 'bottom'];
    for (const side of sides) {
      const port = this.getPortCoords(target, side);
      const circle = new Circle({
        left: port.x,
        top: port.y,
        radius: PORT_INDICATOR_RADIUS,
        fill: PORT_INDICATOR_COLOR,
        stroke: '#ffffff',
        strokeWidth: 1.5,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        opacity: 0.85,
      });
      circle.set('data', { isPortIndicator: true, shapeId, portSide: side });
      this.canvas.add(circle);
    }
    this.canvas.renderAll();
  }

  hidePortIndicators(): void {
    if (!this.canvas) return;
    const indicators = this.canvas.getObjects().filter(
      (obj) => (obj as any).data?.isPortIndicator
    );
    indicators.forEach((obj) => this.canvas!.remove(obj));
    this.canvas.renderAll();
  }

  private getDefaultControlPoint(x1: number, y1: number, x2: number, y2: number): { x: number; y: number } {
    return {
      x: (x1 + x2) / 2,
      y: Math.min(y1, y2) - 60,
    };
  }

  private buildPath(
    start: ConnectorEndpoint,
    end: ConnectorEndpoint,
    routing: ConnectorRoutingType,
    controlPoint: { x: number; y: number },
    stroke: string,
    strokeWidth: number
  ): Path {
    let pathData: string;
    if (routing === ConnectorRoutingType.Curved) {
      pathData = `M ${start.x} ${start.y} Q ${controlPoint.x} ${controlPoint.y} ${end.x} ${end.y}`;
    } else {
      pathData = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }
    return new Path(pathData, {
      fill: '',
      stroke,
      strokeWidth,
      selectable: false,
      evented: false,
      objectCaching: false,
    });
  }

  private getEndAngleStraight(start: ConnectorEndpoint, end: ConnectorEndpoint): number {
    return Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI) + 90;
  }

  private getEndAngleCurved(end: ConnectorEndpoint, cp: { x: number; y: number }): number {
    return Math.atan2(end.y - cp.y, end.x - cp.x) * (180 / Math.PI) + 90;
  }

  private buildArrowhead(x: number, y: number, angleDeg: number, stroke: string): Triangle {
    return new Triangle({
      left: x,
      top: y,
      width: ARROWHEAD_SIZE,
      height: ARROWHEAD_SIZE,
      fill: stroke,
      angle: angleDeg,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
  }

  private buildMidpointHandle(x: number, y: number, connectorId: string): Circle {
    const handle = new Circle({
      left: x,
      top: y,
      radius: MIDPOINT_HANDLE_RADIUS,
      fill: MIDPOINT_HANDLE_COLOR,
      stroke: '#ffffff',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
      selectable: true,
      hasBorders: false,
      hasControls: false,
    });
    handle.set('data', { connectorId, isConnector: true, isMidpointHandle: true });
    return handle;
  }

  private buildEndpointHandle(x: number, y: number, connectorId: string, isStart: boolean): Circle {
    const handle = new Circle({
      left: x,
      top: y,
      radius: ENDPOINT_HANDLE_RADIUS,
      fill: ENDPOINT_HANDLE_COLOR,
      stroke: '#ffffff',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      hasBorders: false,
      hasControls: false,
    });
    handle.set('data', { connectorId, isConnector: true, isEndpointHandle: true, isStart });
    return handle;
  }

  private redrawConnector(id: string): void {
    if (!this.canvas) return;
    const data = this.connectorMap.get(id);
    if (!data) return;

    const toRemove = this.canvas.getObjects().filter(
      (obj) => (obj as any).data?.connectorId === id
    );
    toRemove.forEach((obj) => this.canvas!.remove(obj));

    const stroke = '#374151';
    const strokeWidth = 2;
    const cp = data.controlPoint ?? this.getDefaultControlPoint(data.start.x, data.start.y, data.end.x, data.end.y);

    const path = this.buildPath(data.start, data.end, data.routing, cp, stroke, strokeWidth);
    path.set('data', { connectorId: id, isConnector: true, isConnectorPath: true, connectorData: { ...data } });
    this.canvas.add(path);

    const endAngle = data.routing === ConnectorRoutingType.Curved
      ? this.getEndAngleCurved(data.end, cp)
      : this.getEndAngleStraight(data.start, data.end);

    const endHead = this.buildArrowhead(data.end.x, data.end.y, endAngle, stroke);
    endHead.set('data', { connectorId: id, isConnector: true, isArrowhead: true, isStart: false });
    this.canvas.add(endHead);

    if (data.arrowhead === ConnectorArrowheadType.Double) {
      const startAngle = data.routing === ConnectorRoutingType.Curved
        ? Math.atan2(data.start.y - cp.y, data.start.x - cp.x) * (180 / Math.PI) + 90
        : this.getEndAngleStraight(data.end, data.start);
      const startHead = this.buildArrowhead(data.start.x, data.start.y, startAngle, stroke);
      startHead.set('data', { connectorId: id, isConnector: true, isArrowhead: true, isStart: true });
      this.canvas.add(startHead);
    }

    if (data.routing === ConnectorRoutingType.Curved) {
      const midX = (data.start.x + 2 * cp.x + data.end.x) / 4;
      const midY = (data.start.y + 2 * cp.y + data.end.y) / 4;
      const midHandle = this.buildMidpointHandle(midX, midY, id);
      this.canvas.add(midHandle);
    }

    const startHandle = this.buildEndpointHandle(data.start.x, data.start.y, id, true);
    this.canvas.add(startHandle);
    const endHandle = this.buildEndpointHandle(data.end.x, data.end.y, id, false);
    this.canvas.add(endHandle);

    this.canvas.renderAll();
  }

  createConnector(
    start: { shapeId?: string; portSide: PortSide | 'free'; x: number; y: number },
    end: { shapeId?: string; portSide: PortSide | 'free'; x: number; y: number },
    routing: ConnectorRoutingType,
    arrowhead: ConnectorArrowheadType
  ): string {
    const id = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const data: ConnectorData = {
      id,
      start: { ...start },
      end: { ...end },
      routing,
      arrowhead,
      controlPoint: routing === ConnectorRoutingType.Curved
        ? this.getDefaultControlPoint(start.x, start.y, end.x, end.y)
        : undefined,
    };
    this.connectorMap.set(id, data);

    if (start.shapeId) {
      const list = this.shapeConnectors.get(start.shapeId) ?? [];
      this.shapeConnectors.set(start.shapeId, [...list, id]);
    }
    if (end.shapeId) {
      const list = this.shapeConnectors.get(end.shapeId) ?? [];
      this.shapeConnectors.set(end.shapeId, [...list, id]);
    }

    this.redrawConnector(id);
    return id;
  }

  deleteConnector(connectorId: string): void {
    if (!this.canvas) return;
    const data = this.connectorMap.get(connectorId);
    if (data) {
      this.removeFromShapeConnectors(connectorId, data.start.shapeId);
      this.removeFromShapeConnectors(connectorId, data.end.shapeId);
      this.connectorMap.delete(connectorId);
    }
    const toRemove = this.canvas.getObjects().filter(
      (obj) => (obj as any).data?.connectorId === connectorId
    );
    toRemove.forEach((obj) => this.canvas!.remove(obj));
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  private removeFromShapeConnectors(connectorId: string, shapeId?: string): void {
    if (!shapeId) return;
    const list = this.shapeConnectors.get(shapeId) ?? [];
    const updated = list.filter((id) => id !== connectorId);
    if (updated.length === 0) {
      this.shapeConnectors.delete(shapeId);
    } else {
      this.shapeConnectors.set(shapeId, updated);
    }
  }

  onShapeMoved(shapeId: string): void {
    if (!this.canvas) return;
    const connectorIds = this.shapeConnectors.get(shapeId) ?? [];
    if (connectorIds.length === 0) return;

    const shape = this.canvas.getObjects().find(
      (obj) => (obj as any).data?.shapeId === shapeId
    );
    if (!shape) return;

    for (const connectorId of connectorIds) {
      const data = this.connectorMap.get(connectorId);
      if (!data) continue;

      if (data.start.shapeId === shapeId) {
        const port = this.getPortCoords(shape, data.start.portSide as PortSide);
        data.start.x = port.x;
        data.start.y = port.y;
      }
      if (data.end.shapeId === shapeId) {
        const port = this.getPortCoords(shape, data.end.portSide as PortSide);
        data.end.x = port.x;
        data.end.y = port.y;
      }
      if (data.routing === ConnectorRoutingType.Curved) {
        data.controlPoint = this.getDefaultControlPoint(data.start.x, data.start.y, data.end.x, data.end.y);
      }
      this.redrawConnector(connectorId);
    }
  }

  onShapeRemoved(shapeId: string): void {
    const connectorIds = [...(this.shapeConnectors.get(shapeId) ?? [])];
    for (const id of connectorIds) {
      this.deleteConnector(id);
    }
  }

  onMidpointHandleMoved(connectorId: string, handleX: number, handleY: number): void {
    const data = this.connectorMap.get(connectorId);
    if (!data || data.routing !== ConnectorRoutingType.Curved) return;

    const cpX = (4 * handleX - data.start.x - data.end.x) / 2;
    const cpY = (4 * handleY - data.start.y - data.end.y) / 2;
    data.controlPoint = { x: cpX, y: cpY };
    this.redrawConnector(connectorId);
  }

  rebuildAfterLoad(): void {
    this.rebuildConnectorMaps();
  }

  private rebuildConnectorMaps(): void {
    if (!this.canvas) return;
    this.connectorMap.clear();
    this.shapeConnectors.clear();

    for (const obj of this.canvas.getObjects()) {
      const data = (obj as any).data;
      if (!data?.isConnectorPath || !data.connectorData) continue;

      const cd = data.connectorData as ConnectorData;
      this.connectorMap.set(cd.id, { ...cd });

      if (cd.start.shapeId) {
        const list = this.shapeConnectors.get(cd.start.shapeId) ?? [];
        if (!list.includes(cd.id)) {
          this.shapeConnectors.set(cd.start.shapeId, [...list, cd.id]);
        }
      }
      if (cd.end.shapeId) {
        const list = this.shapeConnectors.get(cd.end.shapeId) ?? [];
        if (!list.includes(cd.id)) {
          this.shapeConnectors.set(cd.end.shapeId, [...list, cd.id]);
        }
      }
    }
  }
}
