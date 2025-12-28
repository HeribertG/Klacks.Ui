/* eslint-disable @typescript-eslint/no-explicit-any */
import { LexicalAnalyser } from './lexicalAnalyser';
import { Symbol, Tokens } from './symbol';
import { Scopes } from './scopes';
import { Opcodes, Code } from './code';
import { InterpreterError } from './interpreterError';

export enum Exits {
  exitNone = 0,
  exitDo = 1,
  exitFor = 2,
  exitFunction = 4,
  exitSub = 8,
}

export abstract class SyntaxAnalyserBase {
  protected _code: Code | undefined = undefined;
  protected _symbol: Symbol = new Symbol();
  protected _symbolTable: Scopes = new Scopes();
  protected _optionExplicit = false;
  protected _allowExternal = false;

  constructor(
    protected interpreterError: InterpreterError | undefined,
    protected lexicalAnalyser: LexicalAnalyser | undefined
  ) {}

  dispose() {
    this.interpreterError = undefined;
    this.lexicalAnalyser = undefined;
  }

  protected getNextSymbol(): Symbol {
    this._symbol = this.lexicalAnalyser!.getNextSymbol();
    return this._symbol;
  }

  protected inSymbolSet(token: Tokens, tokenSet: Tokens[]): boolean {
    return tokenSet.indexOf(token) !== -1;
  }

  protected actualOptionalParameter(defaultRenamed: any) {
    const token = this._symbol.token;

    if (
      token === Tokens.tokComma ||
      token === Tokens.tokStatementDelimiter ||
      token === Tokens.tokEOF ||
      token === Tokens.tokRightParent
    ) {
      this._code!.add(Opcodes.PushValue, [defaultRenamed]);
    } else {
      this.condition();
    }

    if (this._symbol.token === Tokens.tokComma) {
      this.getNextSymbol();
    }
  }

  protected abstract condition(): void;
}
