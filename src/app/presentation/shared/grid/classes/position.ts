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
