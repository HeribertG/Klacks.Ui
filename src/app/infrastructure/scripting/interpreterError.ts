// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ObjectError } from './object-error.constants';

export class InterpreterError {
  public get index(): number {
    return this._index;
  }
  public get number(): number {
    return this._number;
  }
  public get source(): string {
    return this._source;
  }
  public get description(): string {
    return this._description;
  }
  public get line(): number {
    return this._line;
  }
  public get col(): number {
    return this._col;
  }
  public get errSource(): string {
    return this._errSource;
  }

  private _number = -1;
  private _source = '';
  private _description = '';
  private _line = -1;
  private _col = -1;
  private _index = -1;
  private _errSource = '';

  constructor() {
    this.clear();
  }

  raise(
    nbr: number,
    source: string,
    description: string,
    line: number,
    col: number,
    Index: number,
    errSource = ''
  ) {
    this._number = nbr;
    this._source = source;
    this._description = description;
    this._line = line;
    this._col = col;
    this._index = Index;
    this._errSource = errSource;
  }

  clear() {
    this._number = 0;
    this._source = '';
    this._description = '';
    this._line = 0;
    this._col = 0;
    this._index = 0;
    this._errSource = '';
  }
}

export enum runErrors {
  errMath = ObjectError + 61,
  errTimedOut = ObjectError + 62,
  errCancelled = ObjectError + 63,
  errNoUIAllowed = ObjectError + 64,
  errUninitializedVar = ObjectError + 65,
  errUnknownVar = ObjectError + 66,
}
