const ObjectError = -2147221504;

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

  private _number: number = -1;
  private _source: string = '';
  private _description: string = '';
  private _line: number = -1;
  private _col: number = -1;
  private _index: number = -1;
  private _errSource: string = '';

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
    errSource: string = ''
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

export enum inputStreamErrors {
  errGoBackPastStartOfSource = ObjectError + 1,
  errInvalidChar = ObjectError + 2,
  errGoBackNotImplemented = ObjectError + 3,
}
export enum lexErrors {
  errUnknownSymbol = ObjectError + 21,
  errUnexpectedEOF = ObjectError + 22,
  errUnexpectedEOL = ObjectError + 23,
}
export enum parsErrors {
  errMissingClosingParent = ObjectError + 31,
  errUnexpectedSymbol = ObjectError + 32,
  errMissingLeftParent = ObjectError + 33,
  errMissingComma = ObjectError + 34,
  errNoYetImplemented = ObjectError + 35,
  errSyntaxViolation = ObjectError + 36,
  errIdentifierAlreadyExists = ObjectError + 37,
  errWrongNumberOfParams = ObjectError + 38,
  errCannotCallSubInExpression = ObjectError + 39,
}
export enum runErrors {
  errMath = ObjectError + 61,
  errTimedOut = ObjectError + 62,
  errCancelled = ObjectError + 63,
  errNoUIAllowed = ObjectError + 64,
  errUninitializedVar = ObjectError + 65,
  errUnknownVar = ObjectError + 66,
}
