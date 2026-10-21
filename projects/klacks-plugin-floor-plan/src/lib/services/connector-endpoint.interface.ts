// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PortSide } from './port-side.type';

export interface ConnectorEndpoint {
  shapeId?: string;
  portSide: PortSide | 'free';
  x: number;
  y: number;
}
