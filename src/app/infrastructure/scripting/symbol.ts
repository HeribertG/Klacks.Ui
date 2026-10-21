// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Tokens } from './tokens.enum';

/* eslint-disable @typescript-eslint/no-explicit-any */
export class Symbol {
  private _token: Tokens = Tokens.tokNone;
  private _text = '';
  private _value: any | undefined;
  private _line = -1;
  private _col = -1;
  private _index = -1;

  position(line: number, col: number, index: number) {
    this._line = line;
    this._col = col;
    this._index = index;
  }

  init(Token: Tokens, Text = '', Value: any = null) {
    this._token = Token;
    this._text = Text;
    this._value = Value;
  }

  public get token(): Tokens {
    return this._token;
  }

  public get text(): string {
    return this._text;
  }

  public get value(): any {
    return this._value;
  }

  public get line(): number {
    return this._line;
  }

  public get col(): number {
    return this._col;
  }

  public get index(): number {
    return this._index;
  }
}
