// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Tokens } from './symbol';
import { Opcodes } from './code';
import { parsErrors } from './interpreterError';
import { IdentifierTypes } from './identifier';
import { SyntaxAnalyserDeclarations } from './syntaxAnalyserDeclarations';
import { Exits } from './syntaxAnalyserBase';

export abstract class SyntaxAnalyserControlFlow extends SyntaxAnalyserDeclarations {
  protected IFStatement(singleLineOnly: boolean, exitsAllowed: number) {
    this.condition();
    let thenPC = 0;
    let elsePC = 0;

    if (this._symbol.token !== Tokens.tokTHEN) {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.IFStatement',
        'THEN missing after IF',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
      return;
    }

    this.getNextSymbol();

    const thisIFisSingleLineOnly = !(
      this.currentToken === Tokens.tokStatementDelimiter && this._symbol.text === '\n'
    );

    if (this.currentToken === Tokens.tokStatementDelimiter) {
      this.getNextSymbol();
    }

    singleLineOnly = singleLineOnly || thisIFisSingleLineOnly;

    thenPC = this._code!.add(Opcodes.JumpFalse);

    this.statementList(singleLineOnly, false, exitsAllowed, [
      Tokens.tokEOF,
      Tokens.tokELSE,
      Tokens.tokEND,
      Tokens.tokENDIF,
    ]);

    if (this.currentToken === Tokens.tokELSE) {
      elsePC = this._code!.add(Opcodes.Jump);
      this._code!.fixUp(thenPC - 1, [elsePC]);
      this.getNextSymbol();

      this.statementList(singleLineOnly, false, exitsAllowed, [
        Tokens.tokEOF,
        Tokens.tokEND,
        Tokens.tokENDIF,
      ]);
    }

    if (this.currentToken === Tokens.tokEND) {
      if (this.getNextSymbol().token === Tokens.tokIF) {
        this.getNextSymbol();
      } else {
        this.interpreterError!.raise(
          parsErrors.errSyntaxViolation,
          'SyntaxAnalyser.IFStatement',
          'END IF or ENDIF expected to close IF-statement',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } else if (this.currentToken === Tokens.tokENDIF) {
      this.getNextSymbol();
    } else if (!thisIFisSingleLineOnly) {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.IFStatement',
        'END IF or ENDIF expected to close IF-statement',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }

    if (elsePC === 0) {
      this._code!.fixUp(thenPC - 1, [this._code!.endOfCodePC]);
    } else {
      this._code!.fixUp(elsePC - 1, [this._code!.endOfCodePC]);
    }
  }

  protected FORStatement(singleLineOnly: boolean, exitsAllowed: number) {
    if (this._symbol.token !== Tokens.tokIdentifier) {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.FORStatement',
        'Counter variable missing in FOR-statement',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
      return;
    }

    if (
      this._optionExplicit &&
      !this._symbolTable.exists(this._symbol.text, undefined, IdentifierTypes.idVariable)
    ) {
      this.interpreterError!.raise(
        parsErrors.errIdentifierAlreadyExists,
        'SyntaxAnalyser.FORStatement',
        'Variable ' + this._symbol.text + ' not declared',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }

    const counterVariable = this._symbol.text;

    if (this.getNextSymbol().token !== Tokens.tokEq) {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.FORStatement',
        'Expected: = after counter variable',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
      return;
    }

    this.getNextSymbol();
    this.condition();

    this._code!.add(Opcodes.Assign, [counterVariable]);

    if (this.isNotToken(Tokens.tokTO)) {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.FORStatement',
        'Expected: TO after start value of FOR-statement',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
      return;
    }

    this.getNextSymbol();
    this.condition();

    if (this.isToken(Tokens.tokSTEP)) {
      this.getNextSymbol();
      this.condition();
    } else {
      this._code!.add(Opcodes.PushValue, [1]);
    }

    const pushExitAddrPC = this._code!.add(Opcodes.PushValue);
    const forPC = this._code!.endOfCodePC;

    const thisFORisSingleLineOnly = !(
      this.isToken(Tokens.tokStatementDelimiter) && this._symbol.text === '\n'
    );

    if (this.isToken(Tokens.tokStatementDelimiter)) {
      this.getNextSymbol();
    }

    singleLineOnly = singleLineOnly || thisFORisSingleLineOnly;

    this.statementList(singleLineOnly, false, Exits.exitFor | exitsAllowed, [
      Tokens.tokEOF,
      Tokens.tokNEXT,
    ]);

    if (this.isToken(Tokens.tokNEXT)) {
      this.getNextSymbol();
    } else if (!thisFORisSingleLineOnly) {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.FORStatement',
        'Expected: NEXT at end of FOR-statement',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }

    this._code!.add(Opcodes.PopWithIndex, [1]);
    this._code!.add(Opcodes.PushVariable, [counterVariable]);
    this._code!.add(Opcodes.Add);
    this._code!.add(Opcodes.Assign, [counterVariable]);
    this._code!.add(Opcodes.PopWithIndex, [2]);
    this._code!.add(Opcodes.PushVariable, [counterVariable]);
    this._code!.add(Opcodes.GEq);
    this._code!.add(Opcodes.JumpTrue, [forPC]);
    this._code!.add(Opcodes.Pop);
    this._code!.fixUp(pushExitAddrPC - 1, [this._code!.endOfCodePC]);
    this._code!.add(Opcodes.Pop);
    this._code!.add(Opcodes.Pop);
  }

  protected DoStatement(singleLineOnly: boolean, exitsAllowed: number) {
    let conditionPC = -1;
    let doWhile = false;

    const pushExitAddrPC = this._code!.add(Opcodes.PushValue);
    const doPC = this._code!.endOfCodePC;

    if (this.currentToken === Tokens.tokWHILE) {
      doWhile = true;
      this.getNextSymbol();
      this.condition();
      conditionPC = this._code!.add(Opcodes.JumpFalse);
    }

    const thisDOisSingleLineOnly = !(
      this.currentToken === Tokens.tokStatementDelimiter && this._symbol.text === '\n'
    );

    if (this.currentToken === Tokens.tokStatementDelimiter) {
      this.getNextSymbol();
    }

    singleLineOnly = singleLineOnly || thisDOisSingleLineOnly;

    this.statementList(singleLineOnly, false, Exits.exitDo | exitsAllowed, [
      Tokens.tokEOF,
      Tokens.tokLOOP,
    ]);

    if (this.currentToken === Tokens.tokLOOP) {
      const nextToken = this.getNextSymbol().token;

      if (nextToken === Tokens.tokWHILE || nextToken === Tokens.tokUNTIL) {
        if (doWhile) {
          this.interpreterError!.raise(
            parsErrors.errUnexpectedSymbol,
            'SyntaxAnalyser.DoStatement',
            'No WHILE UNTIL allowed after LOOP in DO-WHILE-statement',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index
          );
        }

        const loopWhile = nextToken === Tokens.tokWHILE;
        this.getNextSymbol();
        this.condition();

        this._code!.add(loopWhile ? Opcodes.JumpTrue : Opcodes.JumpFalse, [doPC]);
        this._code!.add(Opcodes.Pop);
        this._code!.fixUp(pushExitAddrPC - 1, [this._code!.endOfCodePC]);
      } else {
        this._code!.add(Opcodes.Jump, [doPC]);
        if (doWhile) {
          this._code!.fixUp(conditionPC - 1, [this._code!.endOfCodePC]);
        }
        this._code!.add(Opcodes.Pop);
        this._code!.fixUp(pushExitAddrPC - 1, [this._code!.endOfCodePC]);
      }
    } else if (!(doWhile && thisDOisSingleLineOnly)) {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.DoStatement',
        'LOOP is missing at end of DO-statement',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index
      );
    }
  }

  protected SelectCaseStatement(singleLineOnly: boolean, exitsAllowed: number) {
    if (this.isNotToken(Tokens.tokCase)) {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.SelectCaseStatement',
        'Expected CASE after SELECT',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
      return;
    }

    this.getNextSymbol();
    this.condition();

    if (this.isToken(Tokens.tokStatementDelimiter)) {
      this.getNextSymbol();
    }

    const endJumps: number[] = [];

    while (this.isToken(Tokens.tokCase) && this.interpreterError!.number === 0) {
      this.getNextSymbol();

      if (this.isToken(Tokens.tokELSE)) {
        this.getNextSymbol();

        if (this.isToken(Tokens.tokStatementDelimiter)) {
          this.getNextSymbol();
        }

        this.statementList(singleLineOnly, false, exitsAllowed, [
          Tokens.tokEOF,
          Tokens.tokEND,
          Tokens.tokCase,
        ]);
      } else {
        let nextCaseJump = -1;
        let firstValue = true;
        let matchJump = -1;

        do {
          if (!firstValue) {
            this.getNextSymbol();
          }
          firstValue = false;

          this._code!.add(Opcodes.PopWithIndex, [0]);
          this.condition();
          this._code!.add(Opcodes.Eq);

          if (this.isToken(Tokens.tokComma)) {
            const tempJump = this._code!.add(Opcodes.JumpTrue);
            if (matchJump === -1) {
              matchJump = tempJump;
            } else {
              this._code!.fixUp(matchJump - 1, [this._code!.endOfCodePC]);
              matchJump = tempJump;
            }
          }
        } while (this.isToken(Tokens.tokComma) && this.interpreterError!.number === 0);

        nextCaseJump = this._code!.add(Opcodes.JumpFalse);

        if (matchJump !== -1) {
          this._code!.fixUp(matchJump - 1, [this._code!.endOfCodePC]);
        }

        if (this.isToken(Tokens.tokStatementDelimiter)) {
          this.getNextSymbol();
        }

        this.statementList(singleLineOnly, false, exitsAllowed, [
          Tokens.tokEOF,
          Tokens.tokEND,
          Tokens.tokCase,
        ]);

        endJumps.push(this._code!.add(Opcodes.Jump));

        this._code!.fixUp(nextCaseJump - 1, [this._code!.endOfCodePC]);
      }
    }

    if (this.isToken(Tokens.tokEND)) {
      if (this.getNextSymbol().token === Tokens.tokSelect) {
        this.getNextSymbol();
      } else {
        this.interpreterError!.raise(
          parsErrors.errSyntaxViolation,
          'SyntaxAnalyser.SelectCaseStatement',
          'Expected SELECT after END',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } else {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.SelectCaseStatement',
        'Expected END SELECT to close SELECT CASE statement',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }

    for (const jumpPc of endJumps) {
      this._code!.fixUp(jumpPc - 1, [this._code!.endOfCodePC]);
    }

    this._code!.add(Opcodes.Pop);
  }
}
