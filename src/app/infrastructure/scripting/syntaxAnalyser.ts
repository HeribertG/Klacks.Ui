import { Tokens } from './symbol';
import { Code } from './code';
import { parsErrors } from './interpreterError';
import { Scopes } from './scopes';
import { SyntaxAnalyserStatements } from './syntaxAnalyserStatements';
import { Exits } from './syntaxAnalyserBase';

export class SyntaxAnalyser extends SyntaxAnalyserStatements {
  parse(code: Code, optionExplicit = true, allowExternal = true): void {
    this._code = code;
    this._symbolTable = new Scopes();
    this._symbolTable.pushScope();
    this._optionExplicit = optionExplicit;
    this._allowExternal = allowExternal;

    this.interpreterError!.clear();

    this.getNextSymbol();

    this.statementList(false, true, Exits.exitNone, [Tokens.tokEOF]);

    if (this._symbol.token !== Tokens.tokEOF) {
      this.interpreterError!.raise(
        parsErrors.errUnexpectedSymbol,
        'syntaxAnalyser.Parse',
        'Expected: end of statement',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }
  }
}
