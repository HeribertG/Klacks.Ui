// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ConnectorEndpoint } from './connector-endpoint.interface';
import { ConnectorRoutingType, ConnectorArrowheadType } from './floor-plan-tool.service';

export interface ConnectorData {
  id: string;
  start: ConnectorEndpoint;
  end: ConnectorEndpoint;
  routing: ConnectorRoutingType;
  arrowhead: ConnectorArrowheadType;
  controlPoint?: { x: number; y: number };
}
