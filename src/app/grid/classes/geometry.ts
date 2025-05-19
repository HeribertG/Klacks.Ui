export class Rectangle {
  left = 0;
  right = 0;
  top = 0;
  bottom = 0;

  constructor(left?: number, top?: number, right?: number, bottom?: number) {
    if (left || left === 0) {
      this.left = left;
    }
    if (right || right === 0) {
      this.right = right;
    }
    if (top || top === 0) {
      this.top = top;
    }
    if (bottom || bottom === 0) {
      this.bottom = bottom;
    }
  }

  get x(): number {
    return this.left;
  }
  set x(value: number) {
    const diff = this.left - value;
    this.left = value;
    this.right -= diff;
  }
  get y(): number {
    return this.top;
  }
  set y(value: number) {
    const diff = this.top - value;
    this.top = value;
    this.bottom -= diff;
  }

  setBounds(l: number, t: number, r: number, b: number): Rectangle {
    this.top = t;
    this.left = l;
    this.bottom = b;
    this.right = r;

    return this;
  }

  get height(): number {
    return this.bottom - this.top;
  }

  get width(): number {
    return this.right - this.left;
  }

  translate(x: number, y: number): Rectangle {
    this.left += x;
    this.right += x;
    this.top += y;
    this.bottom += y;

    return this;
  }

  equals(rect: Rectangle): boolean {
    return (
      rect != null &&
      ((this.isEmpty() && rect.isEmpty()) ||
        (this.left === rect.left &&
          this.top === rect.top &&
          this.width === rect.width &&
          this.height === rect.height))
    );
  }

  isEmpty(): boolean {
    return this.width === 0 && this.height === 0;
  }

  setRect(x: number, y: number, w: number, h: number): this {
    this.setBounds(x, y, x + w, y + h);

    return this;
  }

  clone(): Rectangle {
    return new Rectangle().setRect(
      this.left,
      this.top,
      this.right - this.left,
      this.bottom - this.top
    );
  }

  intersect(rect: Rectangle): Rectangle {
    if (this.isIntersectRect(this, rect)) {
      const x1 = Math.max(this.left, rect.left);
      const x2 = Math.min(this.right, rect.right);
      const y1 = Math.max(this.top, rect.top);
      const y2 = Math.min(this.bottom, rect.bottom);

      return new Rectangle().setRect(
        x1,
        y1,
        Math.max(0, x2 - x1),
        Math.max(0, y2 - y1)
      );
    }

    return new Rectangle();
  }

  isIntersectRect(r1: Rectangle, r2: Rectangle): boolean {
    return !(
      r2.left > r1.right ||
      r2.right < r1.left ||
      r2.top > r1.bottom ||
      r2.bottom < r1.top
    );
  }

  toString(): string {
    return (
      '[' + this.x + ',' + this.y + ',' + this.width + ',' + this.height + ']'
    );
  }

  pointInRect(x: number, y: number): boolean {
    let isHorizontal = false;
    let isVertical = false;

    if (this.left <= x && this.right >= x) {
      isHorizontal = true;
    }
    if (this.top <= y && this.bottom >= y) {
      isVertical = true;
    }

    if (isHorizontal && isVertical) {
      return true;
    }

    return false;
  }
}

export interface ClientRect {
  bottom: number;
  readonly height: number;
  left: number;
  right: number;
  top: number;
  readonly width: number;
}

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

export interface ISize {
  height: number;
  width: number;
}

export class Size implements ISize {
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  height = 0;
  width = 0;

  clone(): Size {
    return new Size(this.width, this.height);
  }

  isEmpty(): boolean {
    return this.width === 0 && this.height === 0;
  }

  equals(size: Size): boolean {
    return (
      size != null &&
      ((this.isEmpty() && size.isEmpty()) ||
        (this.width === size.width && this.height === size.height))
    );
  }
}
