// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Width/height pair with clone, emptiness and equality helpers.
 * @param width - Width in pixels
 * @param height - Height in pixels
 */

import { ISize } from './size.interface';

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
