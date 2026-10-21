// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export class MyPosition {
  private _col = -1;
  private _row = -1;

  constructor(newRow = -1, newCol = -1) {
    this._row = newRow;
    this._col = newCol;
  }

  get column() {
    return this._col;
  }
  get row() {
    return this._row;
  }

  isEmpty(): boolean {
    if (this._row === undefined && this._col === undefined) {
      return true;
    }
    if (this._row === null && this._col === undefined) {
      return true;
    }
    if (this._row === undefined && this._col === null) {
      return true;
    }
    if (this._row === null && this._col === null) {
      return true;
    }
    if (this._row === -1 && this._col === -1) {
      return true;
    }
    return false;
  }

  isEqual(pos: MyPosition): boolean {
    if (this.column === pos.column && this.row === pos.row) {
      return true;
    }
    return false;
  }
}
