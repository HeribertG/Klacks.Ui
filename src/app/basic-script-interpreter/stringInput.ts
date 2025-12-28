import { InterpreterError, inputStreamErrors } from './interpreterError';

export class StringInputStream {
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
    this._sourceIndex++;

    if (this._sourceIndex >= this._sourceText.length) {
      return '';
    }

    const nextChar = this._sourceText.substring(
      this._sourceIndex - 1,
      this._sourceIndex
    );
    this._col++;

    switch (nextChar) {
      case '\t':
        return ' ';

      case '\r': {
        const peek = this._sourceText.substring(this._sourceIndex, this._sourceIndex + 1);
        if (peek === '\n') {
          this._sourceIndex++;
          this._line++;
          this._col = 0;
          return '\n';
        }
        this._col--;
        return '\r';
      }

      case '\n': {
        const peek = this._sourceText.substring(this._sourceIndex, this._sourceIndex + 1);
        if (peek === '\r') {
          this._sourceIndex++;
        }
        this._line++;
        this._col = 0;
        return '\n';
      }

      default:
        if (nextChar >= ' ') {
          return nextChar;
        }
        this.interpreterError!.raise(
          inputStreamErrors.errInvalidChar,
          'stringInput.getNextChar',
          'Invalid character (ASCII ' + nextChar.charCodeAt(0) + ')',
          this.line,
          this.col,
          this.index
        );
        return '';
    }
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
