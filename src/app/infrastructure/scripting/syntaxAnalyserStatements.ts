import { Tokens } from './symbol';
import { Opcodes } from './code';
import { parsErrors } from './interpreterError';
import { IdentifierTypes } from './identifier';
import { SyntaxAnalyserControlFlow } from './syntaxAnalyserControlFlow';
import { Exits } from './syntaxAnalyserBase';

export abstract class SyntaxAnalyserStatements extends SyntaxAnalyserControlFlow {
  protected statementList(
    singleLineOnly: boolean,
    allowFunctionDeclarations: boolean,
    exitsAllowed: number,
    endSymbols: Tokens[]
  ) {
    let exitFunction = false;

    do {
      if (this.interpreterError!.number !== 0) {
        return;
      }

      let currentToken = this._symbol.token;

      if (currentToken === undefined) {
        return;
      }

      while (currentToken === Tokens.tokStatementDelimiter) {
        if (this._symbol.text === '\n' && singleLineOnly) {
          return;
        }
        currentToken = this.getNextSymbol().token;
      }

      if (endSymbols.find((x) => x === currentToken) !== undefined) {
        exitFunction = true;
      }

      if (!exitFunction) {
        this.statement(singleLineOnly, allowFunctionDeclarations, exitsAllowed);
      }
    } while (!exitFunction);
  }

  private statement(
    singleLineOnly: boolean,
    allowFunctionDeclarations: boolean,
    exitsAllowed: number
  ) {
    let ident: string;

    switch (this._symbol.token) {
      case Tokens.tokEXTERNAL:
        if (this._allowExternal) {
          this.getNextSymbol();
          this.variableDeclaration(true);
        } else {
          this.interpreterError!.raise(
            parsErrors.errSyntaxViolation,
            'SyntaxAnalyser.Statement',
            'IMPORT declarations not allowed',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
        break;

      case Tokens.tokCONST:
        this.getNextSymbol();
        this.constDeclaration();
        break;

      case Tokens.tokDIM:
        this.getNextSymbol();
        this.variableDeclaration(false);
        break;

      case Tokens.tokFUNCTION:
        if (allowFunctionDeclarations) {
          this.functionDefinition();
        } else {
          this.interpreterError!.raise(
            parsErrors.errSyntaxViolation,
            'SyntaxAnalyser.Statement',
            'No function declarations allowed at this point',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
        break;

      case Tokens.tokSUB:
        if (allowFunctionDeclarations) {
          this.functionDefinition();
        } else {
          this.interpreterError!.raise(
            parsErrors.errSyntaxViolation,
            'SyntaxAnalyser.Statement',
            'No function declarations allowed at this point',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
        break;

      case Tokens.tokIF:
        this.getNextSymbol();
        this.IFStatement(singleLineOnly, exitsAllowed);
        break;

      case Tokens.tokFOR:
        this.getNextSymbol();
        this.FORStatement(singleLineOnly, exitsAllowed);
        break;

      case Tokens.tokDO:
        this.getNextSymbol();
        this.DoStatement(singleLineOnly, exitsAllowed);
        break;

      case Tokens.tokSelect:
        this.getNextSymbol();
        this.SelectCaseStatement(singleLineOnly, exitsAllowed);
        break;

      case Tokens.tokEXIT:
        this.handleExitStatement(exitsAllowed);
        break;

      case Tokens.tokDebugPrint:
        this.getNextSymbol();
        this.actualOptionalParameter('');
        this._code!.add(Opcodes.DebugPrint);
        break;

      case Tokens.tokDebugClear:
        this._code!.add(Opcodes.DebugClear);
        this.getNextSymbol();
        break;

      case Tokens.tokDebugShow:
        this._code!.add(Opcodes.DebugShow);
        this.getNextSymbol();
        break;

      case Tokens.tokDebugHide:
        this._code!.add(Opcodes.DebugHide);
        this.getNextSymbol();
        break;

      case Tokens.tokResult:
        this.getNextSymbol();
        this.callMsg(true);
        break;

      case Tokens.tokMsgbox:
        this.getNextSymbol();
        this.callMsgBox(true);
        break;

      case Tokens.tokDoEvents:
        this._code!.add(Opcodes.DoEvents);
        this.getNextSymbol();
        break;

      case Tokens.tokInputbox:
        this.getNextSymbol();
        this.callInputbox(true);
        break;

      case Tokens.tokIdentifier:
        ident = this._symbol.text;
        this.handleIdentifierStatement(ident);
        break;

      default:
        this.interpreterError!.raise(
          parsErrors.errUnexpectedSymbol,
          'SyntaxAnalyser.Statement',
          'Expected: declaration, function call or assignment',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
        this.getNextSymbol();
        break;
    }
  }

  private handleExitStatement(exitsAllowed: number) {
    const nextToken = this.getNextSymbol().token;

    switch (nextToken) {
      case Tokens.tokDO:
        if ((exitsAllowed & Exits.exitDo) === Exits.exitDo) {
          this._code!.add(Opcodes.JumpPop);
        } else {
          this.interpreterError!.raise(
            parsErrors.errUnexpectedSymbol,
            'SyntaxAnalyser.Statement',
            'EXIT DO not allowed at this point',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
        break;

      case Tokens.tokFOR:
        if ((exitsAllowed & Exits.exitFor) === Exits.exitFor) {
          this._code!.add(Opcodes.JumpPop);
        } else {
          this.interpreterError!.raise(
            parsErrors.errUnexpectedSymbol,
            'SyntaxAnalyser.Statement',
            'EXIT FOR not allowed at this point',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
        break;

      case Tokens.tokSUB:
        if ((exitsAllowed & Exits.exitSub) === Exits.exitSub) {
          this._code!.add(Opcodes.Return);
        } else if ((exitsAllowed & Exits.exitFunction) === Exits.exitFunction) {
          this.interpreterError!.raise(
            parsErrors.errUnexpectedSymbol,
            'SyntaxAnalyser.Statement',
            'Expected: EXIT FUNCTION in function',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        } else {
          this.interpreterError!.raise(
            parsErrors.errUnexpectedSymbol,
            'SyntaxAnalyser.Statement',
            'EXIT SUB not allowed at this point',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
        break;

      case Tokens.tokFUNCTION:
        if ((exitsAllowed & Exits.exitFunction) === Exits.exitFunction) {
          this._code!.add(Opcodes.Return);
        } else if ((exitsAllowed & Exits.exitSub) === Exits.exitSub) {
          this.interpreterError!.raise(
            parsErrors.errUnexpectedSymbol,
            'SyntaxAnalyser.Statement',
            'Expected: EXIT SUB in sub',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        } else {
          this.interpreterError!.raise(
            parsErrors.errUnexpectedSymbol,
            'SyntaxAnalyser.Statement',
            'EXIT FUNCTION not allowed at this point',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
        break;

      default:
        this.interpreterError!.raise(
          parsErrors.errUnexpectedSymbol,
          'SyntaxAnalyser.Statement',
          'Expected: DO or FOR or FUNCTION after EXIT',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
        break;
    }

    this.getNextSymbol();
  }

  private handleIdentifierStatement(ident: string) {
    const nextToken = this.getNextSymbol().token;

    switch (nextToken) {
      case Tokens.tokEq:
      case Tokens.tokPlusEq:
      case Tokens.tokMinusEq:
      case Tokens.tokMultiplicationEq:
      case Tokens.tokDivisionEq:
      case Tokens.tokStringConcatEq:
      case Tokens.tokDivEq:
      case Tokens.tokModEq:
        this.statementComparativeOperators(ident);
        break;
      default:
        this.callUserDefinedFunction(ident);
    }
  }

  private statementComparativeOperators(ident: string): void {
    const op = this._symbol.token;

    if (this._symbolTable.exists(ident, undefined, IdentifierTypes.idConst)) {
      this.interpreterError!.raise(
        parsErrors.errIdentifierAlreadyExists,
        'Statement',
        'Assignment to constant ' + ident + ' not allowed',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        ident
      );
    }

    if (
      this._optionExplicit &&
      !this._symbolTable.exists(ident, undefined, IdentifierTypes.idIsVariableOfFunction)
    ) {
      this.interpreterError!.raise(
        parsErrors.errIdentifierAlreadyExists,
        'Statement',
        'Variable/Function ' + ident + ' not declared',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        ident
      );
    }

    if (op !== Tokens.tokEq) {
      this._code!.add(Opcodes.PushVariable, [ident]);
    }

    this.getNextSymbol();
    this.condition();

    switch (op) {
      case Tokens.tokPlusEq:
        this._code!.add(Opcodes.Add);
        break;
      case Tokens.tokMinusEq:
        this._code!.add(Opcodes.Sub);
        break;
      case Tokens.tokMultiplicationEq:
        this._code!.add(Opcodes.Multiplication);
        break;
      case Tokens.tokDivisionEq:
        this._code!.add(Opcodes.Division);
        break;
      case Tokens.tokStringConcatEq:
        this._code!.add(Opcodes.StringConcat);
        break;
      case Tokens.tokDivEq:
        this._code!.add(Opcodes.Div);
        break;
      case Tokens.tokModEq:
        this._code!.add(Opcodes.Mod);
        break;
    }

    this._code!.add(Opcodes.Assign, [ident]);
  }
}
