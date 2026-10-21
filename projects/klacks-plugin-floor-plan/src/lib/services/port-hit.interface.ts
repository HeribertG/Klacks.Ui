// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PortSide } from './port-side.type';

export interface PortHit {
  shapeId: string;
  portSide: PortSide;
  x: number;
  y: number;
}
