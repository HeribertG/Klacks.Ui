// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Collection of grid cell positions with bounds (min/max column and row) and membership checks.
 * @param value - Grid position to add or look up
 */

import { MyPosition } from './position';

export class MyPositionCollection {
  private items: MyPosition[];

  constructor() {
    this.items = [];
  }

  getAll(): MyPosition[] {
    return this.items;
  }

  count(): number {
    return this.items.length;
  }

  add(value: MyPosition): void {
    this.items.push(value);
  }

  item(index: number): MyPosition {
    return this.items[index];
  }
  clear(): void {
    if (this.items) {
      this.items = [];
    }
  }

  minColumn(): number {
    return this.items.reduce(
      (min, p) => (p.column < min ? p.column : min),
      this.items[0].column
    );
  }
  maxColumn(): number {
    return this.items.reduce(
      (max, p) => (p.column > max ? p.column : max),
      this.items[0].column
    );
  }
  minRow(): number {
    return this.items.reduce(
      (min, p) => (p.row < min ? p.row : min),
      this.items[0].row
    );
  }
  maxRow(): number {
    return this.items.reduce(
      (max, p) => (p.row > max ? p.row : max),
      this.items[0].row
    );
  }

  contains(value: MyPosition): boolean {
    return this.items.some(
      (x) => x.column === value.column && x.row === value.row
    );
  }
}
