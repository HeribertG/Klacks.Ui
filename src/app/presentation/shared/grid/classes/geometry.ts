// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export { Rectangle, Size, ISize } from 'src/app/shared/helpers/geometry.helper';
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
