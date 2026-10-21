// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export { Rectangle } from 'src/app/domain/models/geometry/rectangle.model';
export { Size } from 'src/app/domain/models/geometry/size.model';
export { ISize } from 'src/app/domain/models/geometry/size.interface';
export interface ClientRect {
  bottom: number;
  readonly height: number;
  left: number;
  right: number;
  top: number;
  readonly width: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getScreenCoordinates(obj: any): unknown {
  const rect = obj.getBoundingClientRect();
  const p = { x: rect.left + window.scrollX, y: rect.top + window.scrollY };
  return p;
}
