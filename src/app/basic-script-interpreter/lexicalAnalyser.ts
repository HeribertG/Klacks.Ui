/* eslint-disable no-constant-condition */
/* eslint-disable no-case-declarations */
import { Symbol, Tokens } from './symbol';
import { InterpreterError, lexErrors } from './interpreterError';
import { StringInputStream } from './stringInput';

export class LexicalAnalyser {
  private COMMENT_CHAR = "'";
  private predefinedIdentifiers = new Map<string, number>();

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isIdentifierStart(c: string): boolean {
    const upper = c.toUpperCase();
    return (
      (upper >= 'A' && upper <= 'Z') ||
      upper === 'Ä' ||
      upper === 'Ö' ||
      upper === 'Ü' ||
      upper === 'ß' ||
      upper === '_' ||
      upper === '@'
    );
  }

  private isIdentifierChar(c: string): boolean {
    return this.isIdentifierStart(c) || this.isDigit(c);
  }

  getNextSymbol(): Symbol {
    const nextSymbol = new Symbol();
    let c = '';
    let symbolText = '';
    let returnNumberSymbol = false;

    if (!this.stringInput!.EOF) {
      do {
        c = this.stringInput!.getNextChar();

        if (c === this.COMMENT_CHAR) {
          this.stringInput!.skipComment();
          c = ' ';
        }
      } while (c === ' ' && !this.stringInput!.EOF);
    }

    nextSymbol.position(
      this.stringInput!.line,
      this.stringInput!.col,
      this.stringInput!.index
    );

    let openingChar: string;
    let res: { returnNumberSymbol: boolean; symbolText: string };

    if (!this.stringInput!.EOF) {
      switch (c.toUpperCase()) {
        case '+':
          this.mathOperatorOrAssignments(nextSymbol, c);
          break;
        case '-':
          this.mathOperatorOrAssignments(nextSymbol, c);
          break;
        case '*':
          this.mathOperatorOrAssignments(nextSymbol, c);
          break;
        case '/':
          this.mathOperatorOrAssignments(nextSymbol, c);
          break;
        case '&':
          this.mathOperatorOrAssignments(nextSymbol, c);
          break;
        case '\\':
          this.mathOperatorOrAssignments(nextSymbol, c);
          break;
        case '%':
          this.mathOperatorOrAssignments(nextSymbol, c);
          break;
        case '^':
          nextSymbol.init(Tokens.tokPower as Tokens, c);
          break;
        case '!':
          nextSymbol.init(Tokens.tokFactorial as Tokens, c);
          break;
        case '~':
          nextSymbol.init(Tokens.tokNOT as Tokens, c);
          break;
        case '(':
          nextSymbol.init(Tokens.tokLeftParent as Tokens, c);
          break;
        case ')':
          nextSymbol.init(Tokens.tokRightParent as Tokens, c);
          break;
        case ',':
          nextSymbol.init(Tokens.tokComma as Tokens, c);
          break;
        case '=':
          nextSymbol.init(Tokens.tokEq as Tokens, c);
          break;
        case '<':
          c = this.stringInput!.getNextChar();
          switch (c) {
            case '>':
              nextSymbol.init(Tokens.tokNotEq as Tokens, '<>');
              break;
            case '=':
              nextSymbol.init(Tokens.tokLEq as Tokens, '<=');
              break;
            default:
              this.stringInput!.goBack();
              nextSymbol.init(Tokens.tokLT as Tokens, '<');
              break;
          }

          break;
        case '>':
          c = this.stringInput!.getNextChar();
          switch (c) {
            case '=':
              nextSymbol.init(Tokens.tokGEq as Tokens, '>=');
              break;
            default:
              this.stringInput!.goBack();
              nextSymbol.init(Tokens.tokGT as Tokens, '>');
              break;
          }
          break;
        case '"':
          openingChar = c;
          symbolText = '';

          let endOfEmptyChar = false;
          do {
            c = this.stringInput!.getNextChar();
            switch (c) {
              case openingChar:
                c = this.stringInput!.getNextChar();
                if (c === openingChar) {
                  symbolText = symbolText + openingChar;
                } else {
                  endOfEmptyChar = true;
                  this.stringInput!.goBack();
                  nextSymbol.init(
                    Tokens.tokString as Tokens,
                    symbolText,
                    symbolText
                  );
                }
                break;
              case '\n':
                this.interpreterError!.raise(
                  lexErrors.errUnexpectedEOL,
                  'LexAnalyser.nextSymbol',
                  'String not closed; unexpected end of line encountered',
                  this.stringInput!.line,
                  this.stringInput!.col,
                  this.stringInput!.index
                );
                break;

              case '':
                this.interpreterError!.raise(
                  lexErrors.errUnexpectedEOF,
                  'LexAnalyser.nextSymbol',
                  'String not closed; unexpected end of source',
                  this.stringInput!.line,
                  this.stringInput!.col,
                  this.stringInput!.index
                );
                break;
              default:
                symbolText = symbolText + c;
                break;
            }
          } while (!endOfEmptyChar);
          break;
        case ':':
          nextSymbol.init(Tokens.tokStatementDelimiter as Tokens, c);
          break;
        case '\n':
          nextSymbol.init(Tokens.tokStatementDelimiter as Tokens, c);
          break;
        default:
          if (this.isDigit(c)) {
            res = this.numbers(nextSymbol, c);
            returnNumberSymbol = res.returnNumberSymbol;
            symbolText = res.symbolText;
          } else if (this.isIdentifierStart(c)) {
            symbolText = this.identifier(nextSymbol, c);
          } else {
            this.interpreterError!.raise(
              lexErrors.errUnknownSymbol,
              'LexicalAnalyser.',
              'Unknown Sym starting with character ASCII ' + c.charCodeAt(0),
              nextSymbol.line,
              nextSymbol.col,
              nextSymbol.index
            );
          }
          break;
      }
    } else {
      nextSymbol.init(Tokens.tokEOF as Tokens);
    }

    if (returnNumberSymbol) {
      nextSymbol.init(Tokens.tokNumber, symbolText, symbolText);
    }

    return nextSymbol;
  }

  private mathOperatorOrAssignments(nextSymbol: Symbol, c: string) {
    let symbolText = c;
    c = this.stringInput!.getNextChar();

    if (c === '=') {
      symbolText = symbolText + c;
    }

    switch (symbolText.substring(0, 1)) {
      case '+':
        nextSymbol.init(
          c === '=' ? Tokens.tokPlusEq : Tokens.tokPlus,
          symbolText
        );
        break;
      case '-':
        nextSymbol.init(
          c === '=' ? Tokens.tokMinusEq : Tokens.tokMinus,
          symbolText
        );
        break;
      case '*':
        nextSymbol.init(
          c === '=' ? Tokens.tokMultiplicationEq : Tokens.tokMultiplication,
          symbolText
        );
        break;
      case '/':
        nextSymbol.init(
          c === '=' ? Tokens.tokDivisionEq : Tokens.tokDivision,
          symbolText
        );
        break;
      case '&':
        nextSymbol.init(
          c === '=' ? Tokens.tokStringConcatEq : Tokens.tokStringConcat,
          symbolText
        );
        break;
      case '\\':
        nextSymbol.init(
          c === '=' ? Tokens.tokDivEq : Tokens.tokDiv,
          symbolText
        );
        break;
      case '%':
        nextSymbol.init(
          c === '=' ? Tokens.tokModEq : Tokens.tokMod,
          symbolText
        );
        break;
    }

    if (c !== '=') {
      this.stringInput!.goBack();
    }
  }

  private numbers(
    nextSymbol: Symbol,
    c: string
  ): { returnNumberSymbol: boolean; symbolText: string } {
    let symbolText = c;
    let returnNumberSymbol = false;

    for (; true; ) {
      c = this.stringInput!.getNextChar();
      if (c >= '0' && c <= '9') {
        symbolText = symbolText + c;
      } else if (c === '.') {
        symbolText = symbolText + '.';
        for (; true; ) {
          c = this.stringInput!.getNextChar();
          if (c >= '0' && c <= '9') {
            symbolText = symbolText + c;
          } else {
            this.stringInput!.goBack();
            returnNumberSymbol = true;
            break;
          }
        }

        break;
      } else {
        this.stringInput!.goBack();
        returnNumberSymbol = true;
        break;
      }
    }
    return { returnNumberSymbol, symbolText };
  }

  private identifier(nextSymbol: Symbol, c: string): string {
    let symbolText = c;

    while (!this.stringInput!.EOF) {
      c = this.stringInput!.getNextChar();
      if (this.isIdentifierChar(c)) {
        symbolText = symbolText + c;
      } else {
        this.stringInput!.goBack();
        break;
      }
    }

    if (this.predefinedIdentifiers.has(symbolText.toUpperCase())) {
      nextSymbol.init(
        this.predefinedIdentifiers.get(symbolText.toUpperCase())!,
        symbolText
      );
    } else {
      nextSymbol.init(Tokens.tokIdentifier, symbolText);
    }

    return symbolText;
  }

  public constructor(
    private interpreterError: InterpreterError | undefined,
    private stringInput: StringInputStream | undefined
  ) {
    this.predefinedIdentifiers.set('DIV', Tokens.tokDiv);
    this.predefinedIdentifiers.set('MOD', Tokens.tokMod);
    this.predefinedIdentifiers.set('AND', Tokens.tokAND);
    this.predefinedIdentifiers.set('OR', Tokens.tokOR);
    this.predefinedIdentifiers.set('NOT', Tokens.tokNOT);
    this.predefinedIdentifiers.set('SIN', Tokens.tokSin);
    this.predefinedIdentifiers.set('COS', Tokens.tokCos);
    this.predefinedIdentifiers.set('TAN', Tokens.tokTan);
    this.predefinedIdentifiers.set('ATAN', Tokens.tokATan);
    this.predefinedIdentifiers.set('IIF', Tokens.tokIIF);
    this.predefinedIdentifiers.set('IF', Tokens.tokIF);
    this.predefinedIdentifiers.set('THEN', Tokens.tokTHEN);
    this.predefinedIdentifiers.set('ELSE', Tokens.tokELSE);
    this.predefinedIdentifiers.set('END', Tokens.tokEND);
    this.predefinedIdentifiers.set('ENDIF', Tokens.tokENDIF);
    this.predefinedIdentifiers.set('DO', Tokens.tokDO);
    this.predefinedIdentifiers.set('WHILE', Tokens.tokWHILE);
    this.predefinedIdentifiers.set('LOOP', Tokens.tokLOOP);
    this.predefinedIdentifiers.set('UNTIL', Tokens.tokUNTIL);
    this.predefinedIdentifiers.set('FOR', Tokens.tokFOR);
    this.predefinedIdentifiers.set('TO', Tokens.tokTO);
    this.predefinedIdentifiers.set('STEP', Tokens.tokSTEP);
    this.predefinedIdentifiers.set('NEXT', Tokens.tokNEXT);
    this.predefinedIdentifiers.set('CONST', Tokens.tokCONST);
    this.predefinedIdentifiers.set('DIM', Tokens.tokDIM);
    this.predefinedIdentifiers.set('FUNCTION', Tokens.tokFUNCTION);
    this.predefinedIdentifiers.set('ENDFUNCTION', Tokens.tokENDFUNCTION);
    this.predefinedIdentifiers.set('SUB', Tokens.tokSUB);
    this.predefinedIdentifiers.set('ENDSUB', Tokens.tokENDSUB);
    this.predefinedIdentifiers.set('EXIT', Tokens.tokEXIT);
    this.predefinedIdentifiers.set('DEBUGPRINT', Tokens.tokDebugPrint);
    this.predefinedIdentifiers.set('DEBUGCLEAR', Tokens.tokDebugClear);
    this.predefinedIdentifiers.set('DEBUGSHOW', Tokens.tokDebugShow);
    this.predefinedIdentifiers.set('DEBUGHIDE', Tokens.tokDebugHide);
    this.predefinedIdentifiers.set('MSGBOX', Tokens.tokMsgbox);
    this.predefinedIdentifiers.set('MESSAGE', Tokens.tokMessage);
    this.predefinedIdentifiers.set('DOEVENTS', Tokens.tokDoEvents);
    this.predefinedIdentifiers.set('INPUTBOX', Tokens.tokInputbox);
    this.predefinedIdentifiers.set('TRUE', Tokens.tokTrue);
    this.predefinedIdentifiers.set('FALSE', Tokens.tokFalse);
    this.predefinedIdentifiers.set('PI', Tokens.tokPI);
    this.predefinedIdentifiers.set('VBCRLF', Tokens.tokCrlf);
    this.predefinedIdentifiers.set('VBTAB', Tokens.tokTab);
    this.predefinedIdentifiers.set('VBCR', Tokens.tokCr);
    this.predefinedIdentifiers.set('VBLF', Tokens.tokLf);
    this.predefinedIdentifiers.set('IMPORT', Tokens.tokEXTERNAL);
  }

  dispose() {
    this.interpreterError = undefined;
    this.stringInput = undefined;
  }
}
