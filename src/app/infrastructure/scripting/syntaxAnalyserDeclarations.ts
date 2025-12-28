/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tokens } from './symbol';
import { Opcodes } from './code';
import { parsErrors } from './interpreterError';
import { IdentifierTypes, Identifier } from './identifier';
import { SyntaxAnalyserExpressions } from './syntaxAnalyserExpressions';
import { Exits } from './syntaxAnalyserBase';

export abstract class SyntaxAnalyserDeclarations extends SyntaxAnalyserExpressions {
  protected abstract statementList(
    singleLineOnly: boolean,
    allowFunctionDeclarations: boolean,
    exitsAllowed: number,
    endSymbols: Tokens[]
  ): void;

  protected constDeclaration(): void {
    if (this._symbol.token === Tokens.tokIdentifier) {
      if (this._symbolTable.exists(this._symbol.text, true)) {
        this.interpreterError!.raise(
          parsErrors.errIdentifierAlreadyExists,
          'ConstDeclaration',
          'Constant identifier ' + this._symbol.text + ' is already declared',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }

      const ident = this._symbol.text;

      if (this.getNextSymbol().token === Tokens.tokEq) {
        const currentToken = this.getNextSymbol().token;

        if (currentToken === Tokens.tokNumber || currentToken === Tokens.tokString) {
          this._symbolTable.allocate(ident, this._symbol.value, IdentifierTypes.idConst);
          this._code!.add(Opcodes.AllocConst, [ident, this._symbol.value]);
          this.getNextSymbol();
        } else {
          this.interpreterError!.raise(
            parsErrors.errUnexpectedSymbol,
            'SyntaxAnalyser.ConstDeclaration',
            'Expected: const value',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
      } else {
        this.interpreterError!.raise(
          parsErrors.errUnexpectedSymbol,
          'SyntaxAnalyser.ConstDeclaration',
          'Expected: = after const identifier',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } else {
      this.interpreterError!.raise(
        parsErrors.errUnexpectedSymbol,
        'SyntaxAnalyser.ConstDeclaration',
        'Expected: const identifier',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }
  }

  protected variableDeclaration(external: boolean): void {
    let returnDo = false;

    do {
      if (this._symbol.token === Tokens.tokIdentifier) {
        if (this._symbolTable.exists(this._symbol.text, true)) {
          this.interpreterError!.raise(
            parsErrors.errIdentifierAlreadyExists,
            'VariableDeclaration',
            'Variable identifier ' + this._symbol.text + ' is already declared',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }

        if (external) {
          this._symbolTable.allocate(this._symbol.text);
        } else {
          this._symbolTable.allocate(this._symbol.text);
          this._code!.add(Opcodes.AllocVar, [this._symbol.text]);
        }

        if (this.getNextSymbol().token === Tokens.tokComma) {
          this.getNextSymbol();
        } else {
          returnDo = true;
        }
      } else {
        this.interpreterError!.raise(
          parsErrors.errUnexpectedSymbol,
          'SyntaxAnalyser.VariableDeclaration',
          'Expected: variable identifier',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } while (!returnDo);
  }

  protected functionDefinition() {
    const res = this.subFunctionDefinition();

    if (res.isOk) {
      this._symbolTable.popScope();
      this._code!.add(Opcodes.Return);
      this._code!.fixUp(res.skipFunctionPC - 1, [this._code!.endOfCodePC]);
    }
  }

  private subFunctionDefinition(): { isOk: boolean; skipFunctionPC: number } {
    const formalParameters: any[] = [];
    const isSub = this._symbol.token === Tokens.tokSUB;
    let definition: Identifier = new Identifier();
    let skipFunctionPC = -1;
    let isOk = false;

    if (this.getNextSymbol().token === Tokens.tokIdentifier) {
      const ident = this._symbol.text;

      if (this.getNextSymbol().token === Tokens.tokLeftParent) {
        let currentToken = this.getNextSymbol().token;

        while (currentToken === Tokens.tokIdentifier) {
          formalParameters.push(this._symbol.text);
          currentToken = this.getNextSymbol().token;
          if (currentToken !== Tokens.tokComma) {
            break;
          }
          currentToken = this.getNextSymbol().token;
        }

        if (currentToken === Tokens.tokRightParent) {
          this.getNextSymbol();
        } else {
          this.interpreterError!.raise(
            parsErrors.errSyntaxViolation,
            'SyntaxAnalyser.FunctionDefinition',
            'Expected: or identifier',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
      }

      definition = this._symbolTable.allocate(
        ident,
        null,
        isSub ? IdentifierTypes.idSub : IdentifierTypes.idFunction
      );
      this._code!.add(Opcodes.AllocVar, [ident]);
      skipFunctionPC = this._code!.add(Opcodes.Jump);
      definition.address = this._code!.endOfCodePC;
      this._symbolTable.pushScope();

      definition.formalParameters = [...formalParameters];

      for (let i = 0; i <= formalParameters.length - 1; i++) {
        this._symbolTable.allocate(formalParameters[i], null, IdentifierTypes.idVariable);
      }

      this.statementList(false, true, isSub ? Exits.exitSub : Exits.exitFunction, [
        Tokens.tokEOF,
        Tokens.tokEND,
        Tokens.tokENDFUNCTION,
        Tokens.tokENDSUB,
      ]);

      const currentToken = this._symbol.token;
      if (currentToken === Tokens.tokENDFUNCTION || currentToken === Tokens.tokENDSUB) {
        if (isSub && this._symbol.token !== Tokens.tokENDSUB) {
          this.interpreterError!.raise(
            parsErrors.errSyntaxViolation,
            'SyntaxAnalyser.FunctionDefinition',
            'Expected: END SUB or ENDSUB at end of sub body',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
        this.getNextSymbol();
        isOk = true;
        return { isOk, skipFunctionPC };
      } else if (currentToken === Tokens.tokEND) {
        const nextToken = this.getNextSymbol().token;
        if (isSub) {
          if (nextToken === Tokens.tokSUB) {
            this.getNextSymbol();
            isOk = true;
            return { isOk, skipFunctionPC };
          } else {
            this.interpreterError!.raise(
              parsErrors.errSyntaxViolation,
              'SyntaxAnalyser.FunctionDefinition',
              'Expected: END SUB or ENDSUB at end of sub body',
              this._symbol.line,
              this._symbol.col,
              this._symbol.index,
              this._symbol.text
            );
          }
        } else if (nextToken === Tokens.tokFUNCTION) {
          this.getNextSymbol();
          isOk = true;
          return { isOk, skipFunctionPC };
        } else {
          this.interpreterError!.raise(
            parsErrors.errSyntaxViolation,
            'SyntaxAnalyser.FunctionDefinition',
            'Expected: END FUNCTION or ENDFUNCTION at end of function body',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
      } else {
        this.interpreterError!.raise(
          parsErrors.errSyntaxViolation,
          'SyntaxAnalyser.FunctionDefinition',
          'Expected: END FUNCTION or ENDFUNCTION, END SUB or ENDSUB at end of function body',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } else {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.FunctionDefinition',
        'Function/Sub name is missing in definition',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }

    return { isOk, skipFunctionPC };
  }

  callUserDefinedFunction(ident: string) {
    let requireRightParent = false;

    if (!this._symbolTable.exists(ident, undefined, IdentifierTypes.idSubOfFunction)) {
      this.interpreterError!.raise(
        parsErrors.errIdentifierAlreadyExists,
        'Statement',
        'Function/Sub ' + ident + ' not declared',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        ident
      );
    }

    if (this._symbol.token === Tokens.tokLeftParent) {
      requireRightParent = true;
      this.getNextSymbol();
    }

    const definition = this._symbolTable.retrieve(ident);
    this._code!.add(Opcodes.PushScope);

    let n = 0;

    if (
      this._symbol.token !== Tokens.tokStatementDelimiter &&
      this._symbol.token !== Tokens.tokEOF
    ) {
      do {
        if (n > definition.formalParameters.length - 1) {
          break;
        }

        if (n > 0) {
          this.getNextSymbol();
        }

        this.condition();
        n += 1;
      } while (this._symbol.token === Tokens.tokComma);
    }

    if (definition.formalParameters.length !== n) {
      this.interpreterError!.raise(
        parsErrors.errWrongNumberOfParams,
        'SyntaxAnalyser.Statement',
        'Wrong number of parameters in call to function ' +
          ident +
          ' ' +
          definition.formalParameters.length +
          ' expected but ' +
          n +
          ' found',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }

    for (let i = definition.formalParameters.length - 1; i >= 0; i--) {
      this._code!.add(Opcodes.AllocVar, [definition.formalParameters[i]]);
      this._code!.add(Opcodes.Assign, [definition.formalParameters[i]]);
    }

    if (requireRightParent) {
      if (this._symbol.token === Tokens.tokRightParent) {
        this.getNextSymbol();
      } else {
        this.interpreterError!.raise(
          parsErrors.errUnexpectedSymbol,
          'SyntaxAnalyser.Statement',
          'Expected: after function parameters',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    }

    this._code!.add(Opcodes.Call, [definition.address]);
    this._code!.add(Opcodes.PopScope);
  }
}
