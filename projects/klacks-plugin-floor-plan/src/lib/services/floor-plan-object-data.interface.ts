// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { FabricObject } from 'fabric';
import { FloorPlanMarkerType } from '@floor-plan-plugin/domain/enums/floor-plan-marker-type.enum';

export interface FloorPlanObjectData {
  shapeId?: string;
  layerId?: string;
  isConnector?: boolean;
  isConnectorPath?: boolean;
  isArrowhead?: boolean;
  isEndpointHandle?: boolean;
  isMidpointHandle?: boolean;
  connectorId?: string;
  isStart?: boolean;
  connectorData?: Record<string, unknown>;
  isPortIndicator?: boolean;
  portSide?: string;
  isPointHandle?: boolean;
  isPointStem?: boolean;
  isAnchor?: boolean;
  isAnchorHighlight?: boolean;
  nodeIndex?: number;
  cpIndex?: 0 | 1;
  isSegmentHandle?: boolean;
  segmentEndNodeIndex?: number;
  markerId?: string;
  markerType?: FloorPlanMarkerType;
  liveMarker?: boolean;
  index?: number;
  shiftId?: string;
  workId?: string;
  clientId?: string;
  clientName?: string;
  abbreviation?: string;
  startTime?: string;
  endTime?: string;
  fromDate?: Date;
  untilDate?: Date;
}

export type FabricWithData = FabricObject & { data?: FloorPlanObjectData };
