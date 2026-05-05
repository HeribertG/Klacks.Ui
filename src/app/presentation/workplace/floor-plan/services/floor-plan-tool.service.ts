// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal, Signal } from '@angular/core';

export enum FloorPlanTool {
  Select = 'select',
  Line = 'line',
  Arrow = 'arrow',
  Connector = 'connector',
  Rectangle = 'rectangle',
  Circle = 'circle',
  Polygon = 'polygon',
  FreeDrawing = 'freeDrawing',
  Text = 'text',
  Pan = 'pan',
  Eraser = 'eraser',
}

export enum ArrowType {
  Simple = 'simple',
  Double = 'double',
  Open = 'open',
  Diamond = 'diamond',
  Curved = 'curved',
}

export enum ConnectorType {
  Straight = 'straight',
  Orthogonal = 'orthogonal',
  Curved = 'curved',
}

const DEFAULT_STROKE_COLOR = '#000000';
const DEFAULT_FILL_COLOR = 'transparent';
const DEFAULT_STROKE_WIDTH = 2;
const DEFAULT_FONT_SIZE = 16;
const DEFAULT_SNAP_SIZE = 20;
const DEFAULT_ARROW_TYPE = ArrowType.Simple;
const DEFAULT_CONNECTOR_TYPE = ConnectorType.Straight;

@Injectable()
export class FloorPlanToolService {
  private readonly _activeTool = signal<FloorPlanTool>(FloorPlanTool.Select);
  private readonly _strokeColor = signal<string>(DEFAULT_STROKE_COLOR);
  private readonly _fillColor = signal<string>(DEFAULT_FILL_COLOR);
  private readonly _strokeWidth = signal<number>(DEFAULT_STROKE_WIDTH);
  private readonly _fontSize = signal<number>(DEFAULT_FONT_SIZE);
  private readonly _snapEnabled = signal<boolean>(true);
  private readonly _snapSize = signal<number>(DEFAULT_SNAP_SIZE);
  private readonly _arrowType = signal<ArrowType>(DEFAULT_ARROW_TYPE);
  private readonly _connectorType = signal<ConnectorType>(DEFAULT_CONNECTOR_TYPE);

  readonly activeTool: Signal<FloorPlanTool> = this._activeTool.asReadonly();
  readonly strokeColor: Signal<string> = this._strokeColor.asReadonly();
  readonly fillColor: Signal<string> = this._fillColor.asReadonly();
  readonly strokeWidth: Signal<number> = this._strokeWidth.asReadonly();
  readonly fontSize: Signal<number> = this._fontSize.asReadonly();
  readonly snapEnabled: Signal<boolean> = this._snapEnabled.asReadonly();
  readonly snapSize: Signal<number> = this._snapSize.asReadonly();
  readonly arrowType: Signal<ArrowType> = this._arrowType.asReadonly();
  readonly connectorType: Signal<ConnectorType> = this._connectorType.asReadonly();

  setTool(tool: FloorPlanTool): void {
    this._activeTool.set(tool);
  }

  setStrokeColor(color: string): void {
    this._strokeColor.set(color);
  }

  setFillColor(color: string): void {
    this._fillColor.set(color);
  }

  setStrokeWidth(width: number): void {
    this._strokeWidth.set(width);
  }

  setFontSize(size: number): void {
    this._fontSize.set(size);
  }

  setSnapEnabled(enabled: boolean): void {
    this._snapEnabled.set(enabled);
  }

  setSnapSize(size: number): void {
    this._snapSize.set(size);
  }

  setArrowType(type: ArrowType): void {
    this._arrowType.set(type);
  }

  setConnectorType(type: ConnectorType): void {
    this._connectorType.set(type);
  }
}
