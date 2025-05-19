export class Sym {
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

export enum Tokens {
  tokNone = -1,
  tokPlus = 0,
  tokMinus = 1,
  tokDivision = 2,
  tokMultiplication = 3,
  tokPower = 4,
  tokFactorial = 5,
  tokDiv = 6,
  tokMod = 7,
  tokStringConcat = 8,
  tokPlusEq = 9,
  tokMinusEq = 10,
  tokMultiplicationEq = 11,
  tokDivisionEq = 12,
  tokStringConcatEq = 13,
  tokDivEq = 14,
  tokModEq = 15,
  tokAND = 16,
  tokOR = 17,
  tokNOT = 18,
  tokEq = 19,
  tokNotEq = 20,
  tokLT = 21,
  tokLEq = 22,
  tokGT = 23,
  tokGEq = 24,
  tokLeftParent = 25,
  tokRightParent = 26,
  tokString = 27,
  tokNumber = 28,
  tokIdentifier = 29,
  tokSin = 30,
  tokCos = 31,
  tokTan = 32,
  tokATan = 33,
  tokIIF = 34,
  tokIF = 35,
  tokTHEN = 36,
  tokELSE = 37,
  tokEND = 38,
  tokENDIF = 39,
  tokDO = 40,
  tokWHILE = 41,
  tokLOOP = 42,
  tokUNTIL = 43,
  tokFOR = 44,
  tokTO = 45,
  tokSTEP = 46,
  tokNEXT = 47,
  tokCONST = 48,
  tokDIM = 49,
  tokEXTERNAL = 50,
  tokFUNCTION = 51,
  tokENDFUNCTION = 52,
  tokSUB = 53,
  tokENDSUB = 54,
  tokEXIT = 55,
  tokComma = 56,
  tokStatementDelimiter = 57,
  tokDebugPrint = 58,
  tokDebugClear = 59,
  tokDebugShow = 60,
  tokDebugHide = 61,
  tokMsgbox = 62,
  tokDoEvents = 63,
  tokInputbox = 64,
  tokMessage = 65,
  tokTrue = 66,
  tokFalse = 67,
  tokPI = 68,
  tokCrlf = 69,
  tokTab = 70,
  tokCr = 71,
  tokLf = 72,
  tokEOF = 73,
}
