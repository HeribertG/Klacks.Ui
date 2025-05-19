import { InterpreterError, inputStreamErrors } from './interpreterError';

export class StringInput {
  private _sourceText = '';
  private _sourceIndex = 0;
  private _line = -1;
  private _col = -1;

  constructor(private interpreterError: InterpreterError | undefined) {}

  read(connectString: string) {
    this._sourceText = connectString;
    this._sourceIndex = 0;
    this._line = 1;
    this._col = 0;
  }

  get EOF(): boolean {
    return this._sourceIndex >= this._sourceText.length;
  }

  get line(): number {
    return this._line;
  }

  get col(): number {
    return this._col;
  }

  get index(): number {
    return this._sourceIndex;
  }

  getNextChar(): string {
    let GetNextChar = '';
    this._sourceIndex++;
    let nextChar: string;

    if (this._sourceIndex < this._sourceText.length) {
      nextChar = this._sourceText.substring(
        this._sourceIndex - 1,
        this._sourceIndex
      );

      this._col++;

      switch (nextChar) {
        case '\t':
          GetNextChar = ' ';
          break;

        case '\r':
          this._col -= 1;
          GetNextChar = nextChar;
          break;

        case '\r\n':
          this._line++;
          this._col = 0;
          GetNextChar = '\n';
          break;

        case '\n':
          this._line++;
          this._col = 0;
          GetNextChar = '\n';
          break;

        default:
          if (nextChar >= ' ') {
            GetNextChar = nextChar;
          } else {
            this.interpreterError!.raise(
              inputStreamErrors.errInvalidChar,
              'stringInput.getNextChar',
              'Invalid character (ASCII ' + nextChar.charCodeAt(0) + ')',
              this.line,
              this.col,
              this.index
            );
          }
          break;
      }
    } else {
      GetNextChar = '';
    }
    return GetNextChar;
  }

  goBack() {
    if (!this.EOF) {
      if (this._sourceIndex > 0) {
        this._col--;
        const c: string = this._sourceText.substring(
          this._sourceIndex,
          this._sourceIndex + 1
        );

        if (c === '\r\n' || c === '\n' || c === '\r') {
          this._line--;
        }
        this._sourceIndex--;
      } else {
        this.interpreterError!.raise(
          inputStreamErrors.errGoBackPastStartOfSource,
          'stringInput.goBack',
          'goBack past start of source',
          0,
          0,
          0
        );
      }
    }
  }

  skipComment() {
    let i = this._sourceText.indexOf('\n', this._sourceIndex);
    if (i === -1) {
      i = this._sourceText.indexOf('\r', this._sourceIndex);
    }
    if (i === -1) {
      i = this._sourceText.indexOf('\r\n', this._sourceIndex);
    }

    if (i === 0) {
      i = this._sourceText.length + 1;
    }

    this._col = this._col + (i - this._sourceIndex);
    this._sourceIndex = i;
  }

  dispose() {
    this.interpreterError = undefined;
  }
}
