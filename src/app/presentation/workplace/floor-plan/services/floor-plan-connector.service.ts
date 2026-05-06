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
}
