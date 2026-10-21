// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PointLike } from './point-like.interface';

export interface ObjectProperties {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  stroke: string;
  fill: string;
  strokeWidth: number;
  rx: number;
  ry: number;
  locked: boolean;
  isRect: boolean;
  isPolygon: boolean;
  isText: boolean;
  points: PointLike[];
  fontFamily: string;
  fontSize: number;
  fontBold: boolean;
  fontItalic: boolean;
  fontUnderline: boolean;
  fontLinethrough: boolean;
  textAlign: string;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  gradientEnabled: boolean;
  gradientColor1: string;
  gradientColor2: string;
  gradientDirection: string;
}
