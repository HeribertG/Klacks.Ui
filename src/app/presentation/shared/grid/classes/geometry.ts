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
  const p = { x: Number, y: Number };
  p.x = obj.offsetLeft;
  p.y = obj.offsetTop;
  while (obj.offsetParent) {
    p.x = p.x + obj.offsetParent.offsetLeft;
    p.y = p.y + obj.offsetParent.offsetTop;
    if (obj === document.getElementsByTagName('body')[0]) {
      break;
    } else {
      obj = obj.offsetParent;
    }
  }
  return p;
}
