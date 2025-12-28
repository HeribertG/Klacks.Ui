import { Tokens } from './symbol';
import { Opcodes } from './code';
import { parsErrors } from './interpreterError';
import { IdentifierTypes } from './identifier';
import { SyntaxAnalyserDeclarations } from './syntaxAnalyserDeclarations';
import { Exits } from './syntaxAnalyserBase';

export abstract class SyntaxAnalyserControlFlow extends SyntaxAnalyserDeclarations {
  protected IFStatement(singleLineOnly: boolean, exitsAllowed: number) {
    let thisIFisSingleLineOnly: boolean;
    this.condition();
    let thenPC = 0;
    let elsePC = 0;

    if (this._symbol.token === Tokens.tokTHEN) {
      this.getNextSymbol();

      thisIFisSingleLineOnly = !(
        this._symbol.token === Tokens.tokStatementDelimiter && this._symbol.text === '\n'
      );

      if (this._symbol.token === Tokens.tokStatementDelimiter) {
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

      if (this._symbol.token === Tokens.tokELSE) {
        elsePC = this._code!.add(Opcodes.Jump);
        this._code!.fixUp(thenPC - 1, [elsePC]);
        this.getNextSymbol();

        this.statementList(singleLineOnly, false, exitsAllowed, [
          Tokens.tokEOF,
          Tokens.tokEND,
          Tokens.tokENDIF,
        ]);
      }

      if (this._symbol.token === Tokens.tokEND) {
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
      } else if (this._symbol.token === Tokens.tokENDIF) {
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
    } else {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.IFStatement',
        'THEN missing after IF',
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
    if (this._symbol.token === Tokens.tokIdentifier) {
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

      if (this.getNextSymbol().token === Tokens.tokEq) {
        this.getNextSymbol();
        this.condition();

        this._code!.add(Opcodes.Assign, [counterVariable]);

        if (this._symbol.token === Tokens.tokTO) {
          this.getNextSymbol();
          this.condition();

          if (this._symbol.token === Tokens.tokSTEP) {
            this.getNextSymbol();
            this.condition();
          } else {
            this._code!.add(Opcodes.PushValue, [1]);
          }

          const pushExitAddrPC = this._code!.add(Opcodes.PushValue);
          const forPC = this._code!.endOfCodePC;

          const thisFORisSingleLineOnly = !(
            this._symbol.token === Tokens.tokStatementDelimiter && this._symbol.text === '\n'
          );

          if (this._symbol.token === Tokens.tokStatementDelimiter) {
            this.getNextSymbol();
          }

          singleLineOnly = singleLineOnly || thisFORisSingleLineOnly;

          this.statementList(singleLineOnly, false, Exits.exitFor | exitsAllowed, [
            Tokens.tokEOF,
            Tokens.tokNEXT,
          ]);

          if (this._symbol.token === Tokens.tokNEXT) {
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
        } else {
          this.interpreterError!.raise(
            parsErrors.errSyntaxViolation,
            'SyntaxAnalyser.FORStatement',
            'Expected: TO after start value of FOR-statement',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
      } else {
        this.interpreterError!.raise(
          parsErrors.errSyntaxViolation,
          'SyntaxAnalyser.FORStatement',
          'Expected: = after counter variable',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } else {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.FORStatement',
        'Counter variable missing in FOR-statement',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }
  }

  protected DoStatement(singleLineOnly: boolean, exitsAllowed: number) {
    let conditionPC = -1;
    let doWhile = false;

    const pushExitAddrPC = this._code!.add(Opcodes.PushValue);
    const doPC = this._code!.endOfCodePC;

    if (this._symbol.token === Tokens.tokWHILE) {
      doWhile = true;
      this.getNextSymbol();
      this.condition();
      conditionPC = this._code!.add(Opcodes.JumpFalse);
    }

    const thisDOisSingleLineOnly = !(
      this._symbol.token === Tokens.tokStatementDelimiter && this._symbol.text === '\n'
    );

    if (this._symbol.token === Tokens.tokStatementDelimiter) {
      this.getNextSymbol();
    }

    singleLineOnly = singleLineOnly || thisDOisSingleLineOnly;

    this.statementList(singleLineOnly, false, Exits.exitDo | exitsAllowed, [
      Tokens.tokEOF,
      Tokens.tokLOOP,
    ]);

    if (this._symbol.token === Tokens.tokLOOP) {
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

        const loopWhile = this._symbol.token === Tokens.tokWHILE;
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
}
