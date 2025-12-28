/* eslint-disable @typescript-eslint/no-unused-vars */
import { Tokens } from './symbol';
import { Opcodes } from './code';
import { parsErrors } from './interpreterError';
import { IdentifierTypes } from './identifier';
import { SyntaxAnalyserBuiltIns } from './syntaxAnalyserBuiltIns';

export abstract class SyntaxAnalyserExpressions extends SyntaxAnalyserBuiltIns {
  protected abstract callUserDefinedFunction(ident: string): void;

  protected condition() {
    this.conditionalTerm();

    while (this.inSymbolSet(this._symbol.token, [Tokens.tokOR])) {
      this.getNextSymbol();
      this.conditionalTerm();
      this._code!.add(Opcodes.Or);
    }
  }

  private conditionalTerm() {
    const operandPCs: number[] = [];

    this.conditionalFactor();

    while (this.inSymbolSet(this._symbol.token, [Tokens.tokAND])) {
      operandPCs.push(this._code!.add(Opcodes.JumpFalse));
      this.getNextSymbol();
      this.conditionalFactor();
    }

    if (operandPCs.length > 0) {
      operandPCs.push(this._code!.add(Opcodes.JumpFalse));
      this._code!.add(Opcodes.PushValue, [true]);
      const thenPC = this._code!.add(Opcodes.Jump);

      for (let i = 0; i < operandPCs.length; i++) {
        this._code!.fixUp(operandPCs[i] - 1, [this._code!.endOfCodePC]);
      }

      this._code!.add(Opcodes.PushValue, [false]);
      this._code!.fixUp(thenPC - 1, [this._code!.endOfCodePC]);
    }
  }

  private conditionalFactor() {
    this.expression();

    while (
      this.inSymbolSet(this._symbol.token, [
        Tokens.tokEq,
        Tokens.tokNotEq,
        Tokens.tokLEq,
        Tokens.tokLT,
        Tokens.tokGEq,
        Tokens.tokGT,
      ])
    ) {
      const operator = this._symbol.token;
      this.getNextSymbol();
      this.expression();

      switch (operator) {
        case Tokens.tokEq:
          this._code!.add(Opcodes.Eq);
          break;
        case Tokens.tokNotEq:
          this._code!.add(Opcodes.NotEq);
          break;
        case Tokens.tokLEq:
          this._code!.add(Opcodes.LEq);
          break;
        case Tokens.tokLT:
          this._code!.add(Opcodes.Lt);
          break;
        case Tokens.tokGEq:
          this._code!.add(Opcodes.GEq);
          break;
        case Tokens.tokGT:
          this._code!.add(Opcodes.Gt);
          break;
      }
    }
  }

  private expression() {
    this.term();

    while (
      this.inSymbolSet(this._symbol.token, [
        Tokens.tokPlus,
        Tokens.tokMinus,
        Tokens.tokMod,
        Tokens.tokStringConcat,
      ])
    ) {
      const operator = this._symbol.token;
      this.getNextSymbol();
      this.term();

      switch (operator) {
        case Tokens.tokPlus:
          this._code!.add(Opcodes.Add);
          break;
        case Tokens.tokMinus:
          this._code!.add(Opcodes.Sub);
          break;
        case Tokens.tokMod:
          this._code!.add(Opcodes.Mod);
          break;
        case Tokens.tokStringConcat:
          this._code!.add(Opcodes.StringConcat);
          break;
      }
    }
  }

  private term() {
    this.factor();

    while (
      this.inSymbolSet(this._symbol.token, [
        Tokens.tokMultiplication,
        Tokens.tokDivision,
        Tokens.tokDiv,
      ])
    ) {
      const operator = this._symbol.token;
      this.getNextSymbol();
      this.factor();

      switch (operator) {
        case Tokens.tokMultiplication:
          this._code!.add(Opcodes.Multiplication);
          break;
        case Tokens.tokDivision:
          this._code!.add(Opcodes.Division);
          break;
        case Tokens.tokDiv:
          this._code!.add(Opcodes.Div);
          break;
      }
    }
  }

  private factor() {
    this.factorial();

    if (this._symbol.token === Tokens.tokPower) {
      this.getNextSymbol();
      this.factorial();
      this._code!.add(Opcodes.Power);
    }
  }

  private factorial() {
    this.terminal();

    if (this._symbol.token === Tokens.tokFactorial) {
      this._code!.add(Opcodes.Factorial);
      this.getNextSymbol();
    }
  }

  private terminal() {
    const currentToken = this._symbol.token;

    switch (currentToken) {
      case Tokens.tokMinus:
        this.getNextSymbol();
        this.terminal();
        this._code!.add(Opcodes.Negate);
        break;

      case Tokens.tokNOT:
        this.getNextSymbol();
        this.terminal();
        this._code!.add(Opcodes.Not);
        break;

      case Tokens.tokNumber:
        this._code!.add(Opcodes.PushValue, this._symbol.value);
        this.getNextSymbol();
        break;

      case Tokens.tokString:
        this._code!.add(Opcodes.PushValue, this._symbol.value);
        this.getNextSymbol();
        break;

      case Tokens.tokIdentifier:
        this.terminalIdentifier();
        break;

      case Tokens.tokTrue:
        this._code!.add(Opcodes.PushValue, [true]);
        this.getNextSymbol();
        break;

      case Tokens.tokFalse:
        this._code!.add(Opcodes.PushValue, [false]);
        this.getNextSymbol();
        break;

      case Tokens.tokPI:
        this._code!.add(Opcodes.PushValue, [3.141592654]);
        this.getNextSymbol();
        break;

      case Tokens.tokCrlf:
        this._code!.add(Opcodes.PushValue, ['\r\n']);
        this.getNextSymbol();
        break;

      case Tokens.tokTab:
        this._code!.add(Opcodes.PushValue, ['\t']);
        this.getNextSymbol();
        break;

      case Tokens.tokCr:
        this._code!.add(Opcodes.PushValue, ['\r']);
        this.getNextSymbol();
        break;

      case Tokens.tokLf:
        this._code!.add(Opcodes.PushValue, ['\n']);
        this.getNextSymbol();
        break;

      case Tokens.tokMsgbox:
      case Tokens.tokInputbox:
      case Tokens.tokMessage:
        this.terminalMessage();
        break;

      case Tokens.tokSin:
      case Tokens.tokCos:
      case Tokens.tokTan:
      case Tokens.tokATan:
        this.terminalTrigonometry();
        break;

      case Tokens.tokIIF:
        this.terminalIIF();
        break;

      case Tokens.tokLeftParent:
        this.getNextSymbol();
        this.condition();
        if (this._symbol.token === Tokens.tokRightParent) {
          this.getNextSymbol();
        } else {
          this.interpreterError!.raise(
            parsErrors.errMissingClosingParent,
            'syntaxAnalyser.Terminal',
            'Missing closing bracket',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
        break;

      case Tokens.tokEOF:
        this.interpreterError!.raise(
          parsErrors.errUnexpectedSymbol,
          'SyntaxAnalyser.Terminal',
          'Identifier or function or expected but end of source found',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
        break;

      default:
        this.interpreterError!.raise(
          parsErrors.errUnexpectedSymbol,
          'SyntaxAnalyser.Terminal',
          'Expected: expression; found symbol ' + this._symbol.text,
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
        break;
    }
  }

  private terminalIdentifier() {
    const text = this._symbol.text;

    if (this._optionExplicit && !this._symbolTable.exists(text)) {
      this.interpreterError!.raise(
        parsErrors.errIdentifierAlreadyExists,
        'SyntaxAnalyser.Terminal',
        'Identifier ' + text + ' has not be declared',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }

    if (this._symbolTable.exists(text, undefined, IdentifierTypes.idFunction)) {
      const ident = text;
      this.getNextSymbol();
      this.callUserDefinedFunction(ident);
      this._code!.add(Opcodes.PushVariable, [ident]);
    } else if (this._symbolTable.exists(text, undefined, IdentifierTypes.idSub)) {
      this.interpreterError!.raise(
        parsErrors.errCannotCallSubInExpression,
        'SyntaxAnalyser.Terminal',
        'Cannot call sub ' + text + ' in expression',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index
      );
    } else {
      this._code!.add(Opcodes.PushVariable, [text]);
      this.getNextSymbol();
    }
  }

  private terminalMessage() {
    const operator = this._symbol.token;

    this.getNextSymbol();
    if (this._symbol.token === Tokens.tokLeftParent) {
      this.getNextSymbol();

      switch (operator) {
        case Tokens.tokMsgbox:
          this.callMsgBox(false);
          break;
        case Tokens.tokInputbox:
          this.callInputbox(false);
          break;
        case Tokens.tokMessage:
          this.callMsg(false);
          break;
      }

      if (this._symbol.token === Tokens.tokRightParent) {
        this.getNextSymbol();
      } else {
        this.interpreterError!.raise(
          parsErrors.errMissingClosingParent,
          'SyntaxAnalyser.Terminal',
          'Missing closing bracket after function parameters',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } else {
      this.interpreterError!.raise(
        parsErrors.errMissingLeftParent,
        'SyntaxAnalyser.Terminal',
        'Missing opening bracket in function call',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }
  }

  private terminalTrigonometry() {
    const operator = this._symbol.token;

    this.getNextSymbol();
    if (this._symbol.token === Tokens.tokLeftParent) {
      this.getNextSymbol();
      this.condition();

      if (this._symbol.token === Tokens.tokRightParent) {
        this.getNextSymbol();

        switch (operator) {
          case Tokens.tokSin:
            this._code!.add(Opcodes.Sin);
            break;
          case Tokens.tokCos:
            this._code!.add(Opcodes.Cos);
            break;
          case Tokens.tokTan:
            this._code!.add(Opcodes.Tan);
            break;
          case Tokens.tokATan:
            this._code!.add(Opcodes.ATan);
            break;
        }
      } else {
        this.interpreterError!.raise(
          parsErrors.errMissingClosingParent,
          'SyntaxAnalyser.Terminal',
          'Missing closing bracket after function parameter',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } else {
      this.interpreterError!.raise(
        parsErrors.errMissingLeftParent,
        'SyntaxAnalyser.Terminal',
        'Missing opening bracket after function name',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }
  }

  private terminalIIF() {
    this.getNextSymbol();

    if (this._symbol.token === Tokens.tokLeftParent) {
      this.getNextSymbol();
      this.condition();

      const thenPC = this._code!.add(Opcodes.JumpFalse);

      if (this._symbol.token === Tokens.tokComma) {
        this.getNextSymbol();
        this.condition();

        const elsePC = this._code!.add(Opcodes.Jump);
        this._code!.fixUp(thenPC - 1, [this._code!.endOfCodePC]);

        if (this._symbol.token === Tokens.tokComma) {
          this.getNextSymbol();
          this.condition();

          this._code!.fixUp(elsePC - 1, [this._code!.endOfCodePC]);

          if (this._symbol.token === Tokens.tokRightParent) {
            this.getNextSymbol();
          } else {
            this.interpreterError!.raise(
              parsErrors.errMissingClosingParent,
              'syntaxAnalyser.Terminal',
              'Missing closing bracket after last IIF-parameter',
              this._symbol.line,
              this._symbol.col,
              this._symbol.index,
              this._symbol.text
            );
          }
        } else {
          this.interpreterError!.raise(
            parsErrors.errMissingComma,
            'syntaxAnalyser.Terminal',
            'Missing after true-value of IIF',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
      } else {
        this.interpreterError!.raise(
          parsErrors.errMissingComma,
          'syntaxAnalyser.Terminal',
          'Missing after IIF-condition',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } else {
      this.interpreterError!.raise(
        parsErrors.errMissingLeftParent,
        'SyntaxAnalyser.Terminal',
        'Missing opening bracket after IIF',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }
  }
}
