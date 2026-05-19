// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service managing connector creation, selection, sticky shape attachment, and path rendering on the floor plan canvas.
 * @param canvas - Fabric.js Canvas instance provided via init(canvas)
 */

import { Injectable } from '@angular/core';
import { Canvas, Path, Triangle, Circle, FabricObject } from 'fabric';
import { ConnectorRoutingType, ConnectorArrowheadType } from './floor-plan-tool.service';
import { FabricWithData } from './floor-plan-object-data.interface';

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
const CONNECTOR_STROKE_COLOR = '#374151';
const CONNECTOR_STROKE_WIDTH = 2;
const CONTROL_POINT_Y_OFFSET = 60;

@Injectable()
export class FloorPlanConnectorService {
  private canvas: Canvas | null = null;
  private connectorMap = new Map<string, ConnectorData>();
  private shapeConnectors = new Map<string, string[]>();
  private isRedrawing = false;
  private _selectedConnectorId: string | null = null;

  get redrawing(): boolean {
    return this.isRedrawing;
  }

  get selectedConnectorId(): string | null {
    return this._selectedConnectorId;
  }

  init(canvas: Canvas): void {
    this.canvas = canvas;
    this.connectorMap.clear();
    this.shapeConnectors.clear();
    this._selectedConnectorId = null;
  }

  selectConnector(id: string): void {
    if (!this.canvas) return;
    if (this._selectedConnectorId && this._selectedConnectorId !== id) {
      this.setHandlesVisible(this._selectedConnectorId, false);
    }
    this._selectedConnectorId = id;
    this.setHandlesVisible(id, true);
    this.canvas.renderAll();
  }

  deselectAll(): void {
    if (!this.canvas) return;
    if (this._selectedConnectorId) {
      this.setHandlesVisible(this._selectedConnectorId, false);
      this._selectedConnectorId = null;
      this.canvas.renderAll();
    }
  }

  private setHandlesVisible(id: string, visible: boolean): void {
    if (!this.canvas) return;
    const handles = this.canvas.getObjects().filter((obj) => {
      const d = (obj as FabricWithData).data;
      return d?.connectorId === id && (d.isEndpointHandle || d.isMidpointHandle);
    });
    for (const h of handles) {
      h.set({ opacity: visible ? 1 : 0, selectable: visible, evented: visible });
    }
  }

  private getPortCoords(obj: FabricObject, side: PortSide): { x: number; y: number } {
    const scaleX = obj.scaleX ?? 1;
    const scaleY = obj.scaleY ?? 1;
    const w = (obj.width ?? 0) * scaleX;
    const h = (obj.height ?? 0) * scaleY;
    const l = obj.left ?? 0;
    const t = obj.top ?? 0;
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
      const data = (obj as FabricWithData).data;
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
      (obj) => (obj as FabricWithData).data?.shapeId === shapeId && !(obj as FabricWithData).data?.isConnector
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
      (obj) => (obj as FabricWithData).data?.isPortIndicator
    );
    indicators.forEach((obj) => this.canvas!.remove(obj));
    this.canvas.renderAll();
  }

  private getDefaultControlPoint(x1: number, y1: number, x2: number, y2: number): { x: number; y: number } {
    return {
      x: (x1 + x2) / 2,
      y: Math.min(y1, y2) - CONTROL_POINT_Y_OFFSET,
    };
  }

  private isHorizontalRoute(start: ConnectorEndpoint, end: ConnectorEndpoint): boolean {
    const startHoriz = start.portSide === 'left' || start.portSide === 'right';
    const endHoriz   = end.portSide   === 'left' || end.portSide   === 'right';
    const startVert  = start.portSide === 'top'  || start.portSide === 'bottom';
    const endVert    = end.portSide   === 'top'  || end.portSide   === 'bottom';
    if (startHoriz && endHoriz) return true;
    if (startVert  && endVert)  return false;
    return Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  }

  private getPathData(
    start: ConnectorEndpoint,
    end: ConnectorEndpoint,
    routing: ConnectorRoutingType,
    controlPoint: { x: number; y: number }
  ): string {
    if (routing === ConnectorRoutingType.Curved) {
      return `M ${start.x} ${start.y} Q ${controlPoint.x} ${controlPoint.y} ${end.x} ${end.y}`;
    }
    if (routing === ConnectorRoutingType.SCurve) {
      if (this.isHorizontalRoute(start, end)) {
        const dx = (end.x - start.x) / 2;
        return `M ${start.x} ${start.y} C ${start.x + dx} ${start.y} ${end.x - dx} ${end.y} ${end.x} ${end.y}`;
      } else {
        const dy = (end.y - start.y) / 2;
        return `M ${start.x} ${start.y} C ${start.x} ${start.y + dy} ${end.x} ${end.y - dy} ${end.x} ${end.y}`;
      }
    }
    if (routing === ConnectorRoutingType.Orthogonal) {
      if (this.isHorizontalRoute(start, end)) {
        const xmid = (start.x + end.x) / 2;
        return `M ${start.x} ${start.y} L ${xmid} ${start.y} L ${xmid} ${end.y} L ${end.x} ${end.y}`;
      } else {
        const ymid = (start.y + end.y) / 2;
        return `M ${start.x} ${start.y} L ${start.x} ${ymid} L ${end.x} ${ymid} L ${end.x} ${end.y}`;
      }
    }
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  private buildPath(
    start: ConnectorEndpoint,
    end: ConnectorEndpoint,
    routing: ConnectorRoutingType,
    controlPoint: { x: number; y: number },
    stroke: string,
    strokeWidth: number
  ): Path {
    const pathData = this.getPathData(start, end, routing, controlPoint);
    return new Path(pathData, {
      fill: '',
      stroke,
      strokeWidth,
      selectable: false,
      evented: true,
      objectCaching: false,
    });
  }

  private getEndAngleStraight(start: ConnectorEndpoint, end: ConnectorEndpoint): number {
    return Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI) + 90;
  }

  private getEndAngleCurved(end: ConnectorEndpoint, cp: { x: number; y: number }): number {
    return Math.atan2(end.y - cp.y, end.x - cp.x) * (180 / Math.PI) + 90;
  }

  private getEndAngleAutoRoute(start: ConnectorEndpoint, end: ConnectorEndpoint): number {
    if (this.isHorizontalRoute(start, end)) {
      return Math.atan2(0, end.x - start.x) * (180 / Math.PI) + 90;
    }
    return Math.atan2(end.y - start.y, 0) * (180 / Math.PI) + 90;
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
      opacity: 0,
      selectable: false,
      evented: false,
      hasBorders: false,
      hasControls: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
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
      opacity: 0,
      selectable: false,
      evented: false,
      hasBorders: false,
      hasControls: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
    });
    handle.set('data', { connectorId, isConnector: true, isEndpointHandle: true, isStart });
    return handle;
  }

  private redrawConnector(id: string): void {
    if (!this.canvas) return;
    const data = this.connectorMap.get(id);
    if (!data) return;

    try {
      this.isRedrawing = true;
      const toRemove = this.canvas.getObjects().filter(
        (obj) => (obj as FabricWithData).data?.connectorId === id
      );
      toRemove.forEach((obj) => this.canvas!.remove(obj));

      const stroke = CONNECTOR_STROKE_COLOR;
      const strokeWidth = CONNECTOR_STROKE_WIDTH;
      const cp = data.controlPoint ?? this.getDefaultControlPoint(data.start.x, data.start.y, data.end.x, data.end.y);

      const path = this.buildPath(data.start, data.end, data.routing, cp, stroke, strokeWidth);
      path.set('data', { connectorId: id, isConnector: true, isConnectorPath: true, connectorData: { ...data } });
      this.canvas.add(path);

      const endAngle = data.routing === ConnectorRoutingType.Curved
        ? this.getEndAngleCurved(data.end, cp)
        : (data.routing === ConnectorRoutingType.SCurve || data.routing === ConnectorRoutingType.Orthogonal)
          ? this.getEndAngleAutoRoute(data.start, data.end)
          : this.getEndAngleStraight(data.start, data.end);

      const endHead = this.buildArrowhead(data.end.x, data.end.y, endAngle, stroke);
      endHead.set('data', { connectorId: id, isConnector: true, isArrowhead: true, isStart: false });
      this.canvas.add(endHead);

      if (data.arrowhead === ConnectorArrowheadType.Double) {
        const startAngle = data.routing === ConnectorRoutingType.Curved
          ? Math.atan2(data.start.y - cp.y, data.start.x - cp.x) * (180 / Math.PI) + 90
          : (data.routing === ConnectorRoutingType.SCurve || data.routing === ConnectorRoutingType.Orthogonal)
            ? this.getEndAngleAutoRoute(data.end, data.start)
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
    } finally {
      this.isRedrawing = false;
    }

    if (this._selectedConnectorId === id) {
      this.setHandlesVisible(id, true);
    }

    this.canvas.renderAll();
  }

  private redrawConnectorPathOnly(id: string): void {
    if (!this.canvas) return;
    const data = this.connectorMap.get(id);
    if (!data) return;

    try {
      this.isRedrawing = true;
      const toRemove = this.canvas.getObjects().filter((obj) => {
        const d = (obj as FabricWithData).data;
        return d?.connectorId === id && (d.isConnectorPath || d.isArrowhead);
      });
      toRemove.forEach((obj) => this.canvas!.remove(obj));

      const stroke = CONNECTOR_STROKE_COLOR;
      const strokeWidth = CONNECTOR_STROKE_WIDTH;
      const cp = data.controlPoint ?? this.getDefaultControlPoint(data.start.x, data.start.y, data.end.x, data.end.y);

      const path = this.buildPath(data.start, data.end, data.routing, cp, stroke, strokeWidth);
      path.set('data', { connectorId: id, isConnector: true, isConnectorPath: true, connectorData: { ...data } });
      this.canvas.add(path);

      const endAngle = data.routing === ConnectorRoutingType.Curved
        ? this.getEndAngleCurved(data.end, cp)
        : (data.routing === ConnectorRoutingType.SCurve || data.routing === ConnectorRoutingType.Orthogonal)
          ? this.getEndAngleAutoRoute(data.start, data.end)
          : this.getEndAngleStraight(data.start, data.end);
      const endHead = this.buildArrowhead(data.end.x, data.end.y, endAngle, stroke);
      endHead.set('data', { connectorId: id, isConnector: true, isArrowhead: true, isStart: false });
      this.canvas.add(endHead);

      if (data.arrowhead === ConnectorArrowheadType.Double) {
        const startAngle = data.routing === ConnectorRoutingType.Curved
          ? Math.atan2(data.start.y - cp.y, data.start.x - cp.x) * (180 / Math.PI) + 90
          : (data.routing === ConnectorRoutingType.SCurve || data.routing === ConnectorRoutingType.Orthogonal)
            ? this.getEndAngleAutoRoute(data.end, data.start)
            : this.getEndAngleStraight(data.end, data.start);
        const startHead = this.buildArrowhead(data.start.x, data.start.y, startAngle, stroke);
        startHead.set('data', { connectorId: id, isConnector: true, isArrowhead: true, isStart: true });
        this.canvas.add(startHead);
      }
    } finally {
      this.isRedrawing = false;
    }

    this.canvas.renderAll();
  }

  createConnector(
    start: { shapeId?: string; portSide: PortSide | 'free'; x: number; y: number },
    end: { shapeId?: string; portSide: PortSide | 'free'; x: number; y: number },
    routing: ConnectorRoutingType,
    arrowhead: ConnectorArrowheadType
  ): string {
    const id = `conn-${crypto.randomUUID()}`;
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
    if (this._selectedConnectorId === connectorId) {
      this._selectedConnectorId = null;
    }
    const data = this.connectorMap.get(connectorId);
    if (data) {
      this.removeFromShapeConnectors(connectorId, data.start.shapeId);
      this.removeFromShapeConnectors(connectorId, data.end.shapeId);
      this.connectorMap.delete(connectorId);
    }
    const toRemove = this.canvas.getObjects().filter(
      (obj) => (obj as FabricWithData).data?.connectorId === connectorId
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
      (obj) => (obj as FabricWithData).data?.shapeId === shapeId
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

  releaseShape(shapeId: string): void {
    if (!this.canvas) return;
    const connectorIds = [...(this.shapeConnectors.get(shapeId) ?? [])];
    if (connectorIds.length === 0) return;
    for (const connId of connectorIds) {
      const data = this.connectorMap.get(connId);
      if (!data) continue;
      if (data.start.shapeId === shapeId) {
        data.start = { portSide: 'free', x: data.start.x, y: data.start.y };
      }
      if (data.end.shapeId === shapeId) {
        data.end = { portSide: 'free', x: data.end.x, y: data.end.y };
      }
      if (data.routing === ConnectorRoutingType.Curved) {
        data.controlPoint = this.getDefaultControlPoint(data.start.x, data.start.y, data.end.x, data.end.y);
      }
      this.redrawConnector(connId);
    }
    this.shapeConnectors.delete(shapeId);
  }

  reattachConnectors(oldShapeIds: string[], newShapeId: string): Set<string> {
    const transferredConnectorIds = new Set<string>();

    for (const oldId of oldShapeIds) {
      const connectorIds = this.shapeConnectors.get(oldId) ?? [];
      for (const connId of connectorIds) {
        const data = this.connectorMap.get(connId);
        if (!data) continue;
        if (data.start.shapeId === oldId) {
          data.start = { ...data.start, shapeId: newShapeId };
        }
        if (data.end.shapeId === oldId) {
          data.end = { ...data.end, shapeId: newShapeId };
        }
        transferredConnectorIds.add(connId);
      }
      this.shapeConnectors.delete(oldId);
    }

    if (transferredConnectorIds.size > 0) {
      const existing = this.shapeConnectors.get(newShapeId) ?? [];
      const merged = [...new Set([...existing, ...transferredConnectorIds])];
      this.shapeConnectors.set(newShapeId, merged);
      this.onShapeMoved(newShapeId);
    }

    return transferredConnectorIds;
  }

  isSelfLoop(connectorId: string, shapeId: string): boolean {
    const data = this.connectorMap.get(connectorId);
    return data?.start.shapeId === shapeId && data?.end.shapeId === shapeId;
  }

  onMidpointHandleMoved(connectorId: string, handleX: number, handleY: number): void {
    const data = this.connectorMap.get(connectorId);
    if (!data || data.routing !== ConnectorRoutingType.Curved) return;

    const cpX = (4 * handleX - data.start.x - data.end.x) / 2;
    const cpY = (4 * handleY - data.start.y - data.end.y) / 2;
    data.controlPoint = { x: cpX, y: cpY };
    this.redrawConnectorPathOnly(connectorId);
  }

  onEndpointHandleMoved(connectorId: string, isStart: boolean, x: number, y: number): void {
    const data = this.connectorMap.get(connectorId);
    if (!data) return;

    const endpoint = isStart ? data.start : data.end;
    if (endpoint.shapeId) {
      this.removeFromShapeConnectors(connectorId, endpoint.shapeId);
    }

    if (isStart) {
      data.start = { portSide: 'free', x, y };
    } else {
      data.end = { portSide: 'free', x, y };
    }

    if (data.routing === ConnectorRoutingType.Curved) {
      data.controlPoint = this.getDefaultControlPoint(data.start.x, data.start.y, data.end.x, data.end.y);
    }

    this.redrawConnectorPathOnly(connectorId);
  }

  onEndpointHandleReleased(connectorId: string, isStart: boolean, x: number, y: number, portHit: PortHit | null): void {
    const data = this.connectorMap.get(connectorId);
    if (!data) return;

    if (portHit) {
      const newEndpoint = { shapeId: portHit.shapeId, portSide: portHit.portSide, x: portHit.x, y: portHit.y };
      if (isStart) {
        data.start = newEndpoint;
      } else {
        data.end = newEndpoint;
      }
      const list = this.shapeConnectors.get(portHit.shapeId) ?? [];
      if (!list.includes(connectorId)) {
        this.shapeConnectors.set(portHit.shapeId, [...list, connectorId]);
      }
    } else {
      if (isStart) {
        data.start = { portSide: 'free', x, y };
      } else {
        data.end = { portSide: 'free', x, y };
      }
    }

    if (data.routing === ConnectorRoutingType.Curved) {
      data.controlPoint = this.getDefaultControlPoint(data.start.x, data.start.y, data.end.x, data.end.y);
    }

    this.redrawConnector(connectorId);
  }

  refreshConnector(connectorId: string): void {
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
      const data = (obj as FabricWithData).data;
      if (!data?.isConnectorPath || !data.connectorData) continue;

      const cd = data.connectorData as unknown as ConnectorData;
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
