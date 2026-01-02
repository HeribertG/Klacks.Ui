import { Tokens } from './symbol';
import { Opcodes } from './code';
import { parsErrors } from './interpreterError';
import { IdentifierTypes } from './identifier';
import { SyntaxAnalyserBuiltIns } from './syntaxAnalyserBuiltIns';

export abstract class SyntaxAnalyserExpressions extends SyntaxAnalyserBuiltIns {
  protected abstract callUserDefinedFunction(ident: string): void;

  protected condition() {
    this.orElseTerm();

    while (this.inSymbolSet(this._symbol.token, [Tokens.tokOR, Tokens.tokOrElse])) {
      const isOrElse = this._symbol.token === Tokens.tokOrElse;
      this.getNextSymbol();

      if (isOrElse) {
        // OrElse: Short-Circuit - result is True if any operand is truthy
        const skipPC = this._code!.add(Opcodes.JumpTrue);
        this.orElseTerm();
        const secondTruePC = this._code!.add(Opcodes.JumpTrue);
        this._code!.add(Opcodes.PushValue, [false]);
        const endPC = this._code!.add(Opcodes.Jump);
        this._code!.fixUp(skipPC - 1, [this._code!.endOfCodePC]);
        this._code!.fixUp(secondTruePC - 1, [this._code!.endOfCodePC]);
        this._code!.add(Opcodes.PushValue, [true]);
        this._code!.fixUp(endPC - 1, [this._code!.endOfCodePC]);
      } else {
        // Or: Bitwise
        this.orElseTerm();
        this._code!.add(Opcodes.Or);
      }
    }
  }

  private orElseTerm() {
    this.andAlsoFactor();

    while (this.inSymbolSet(this._symbol.token, [Tokens.tokAND, Tokens.tokAndAlso])) {
      const isAndAlso = this._symbol.token === Tokens.tokAndAlso;
      this.getNextSymbol();

      if (isAndAlso) {
        // AndAlso: Short-Circuit - result is True only if both operands are truthy
        const skipPC = this._code!.add(Opcodes.JumpFalse);
        this.andAlsoFactor();
        const secondFalsePC = this._code!.add(Opcodes.JumpFalse);
        this._code!.add(Opcodes.PushValue, [true]);
        const endPC = this._code!.add(Opcodes.Jump);
        this._code!.fixUp(skipPC - 1, [this._code!.endOfCodePC]);
        this._code!.fixUp(secondFalsePC - 1, [this._code!.endOfCodePC]);
        this._code!.add(Opcodes.PushValue, [false]);
        this._code!.fixUp(endPC - 1, [this._code!.endOfCodePC]);
      } else {
        // And: Bitwise
        this.andAlsoFactor();
        this._code!.add(Opcodes.And);
      }
    }
  }

  private andAlsoFactor() {
    this.conditionalFactor();
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
      case Tokens.tokOutput:
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

      // String Functions
      case Tokens.tokLen:
        this.callUnaryFunction(Opcodes.Len);
        break;
      case Tokens.tokLeft:
        this.callBinaryFunction(Opcodes.Left);
        break;
      case Tokens.tokRight:
        this.callBinaryFunction(Opcodes.Right);
        break;
      case Tokens.tokMid:
        this.callTernaryFunction(Opcodes.Mid);
        break;
      case Tokens.tokInStr:
        this.callBinaryFunction(Opcodes.InStr);
        break;
      case Tokens.tokReplace:
        this.callTernaryFunction(Opcodes.Replace);
        break;
      case Tokens.tokTrim:
        this.callUnaryFunction(Opcodes.Trim);
        break;
      case Tokens.tokUCase:
        this.callUnaryFunction(Opcodes.UCase);
        break;
      case Tokens.tokLCase:
        this.callUnaryFunction(Opcodes.LCase);
        break;

      // Math Functions
      case Tokens.tokAbs:
        this.callUnaryFunction(Opcodes.Abs);
        break;
      case Tokens.tokRound:
        this.callRoundFunction();
        break;
      case Tokens.tokSqr:
        this.callUnaryFunction(Opcodes.Sqr);
        break;
      case Tokens.tokRnd:
        this.callRnd();
        break;
      case Tokens.tokLog:
        this.callUnaryFunction(Opcodes.Log);
        break;
      case Tokens.tokExp:
        this.callUnaryFunction(Opcodes.Exp);
        break;
      case Tokens.tokSgn:
        this.callUnaryFunction(Opcodes.Sgn);
        break;

      // Time Functions
      case Tokens.tokTimeToHours:
        this.callUnaryFunction(Opcodes.TimeToHours);
        break;
      case Tokens.tokTimeOverlap:
        this.callQuaternaryFunction(Opcodes.TimeOverlap);
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

    if (this.getNextSymbol().token !== Tokens.tokLeftParent) {
      this.interpreterError!.raise(
        parsErrors.errMissingLeftParent,
        'SyntaxAnalyser.Terminal',
        'Missing opening bracket in function call',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
      return;
    }

    this.getNextSymbol();

    switch (operator) {
      case Tokens.tokMsgbox:
        this.callMsgBox(false);
        break;
      case Tokens.tokInputbox:
        this.callInputbox(false);
        break;
      case Tokens.tokOutput:
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
  }

  private terminalTrigonometry() {
    const operator = this._symbol.token;

    if (this.getNextSymbol().token !== Tokens.tokLeftParent) {
      this.interpreterError!.raise(
        parsErrors.errMissingLeftParent,
        'SyntaxAnalyser.Terminal',
        'Missing opening bracket after function name',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
      return;
    }

    this.getNextSymbol();
    this.condition();

    if (this._symbol.token !== Tokens.tokRightParent) {
      this.interpreterError!.raise(
        parsErrors.errMissingClosingParent,
        'SyntaxAnalyser.Terminal',
        'Missing closing bracket after function parameter',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
      return;
    }

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
  }

  private terminalIIF() {
    if (this.getNextSymbol().token !== Tokens.tokLeftParent) {
      this.interpreterError!.raise(
        parsErrors.errMissingLeftParent,
        'SyntaxAnalyser.Terminal',
        'Missing opening bracket after IIF',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
      return;
    }

    this.getNextSymbol();
    this.condition();

    const thenPC = this._code!.add(Opcodes.JumpFalse);

    if (this._symbol.token !== Tokens.tokComma) {
      this.interpreterError!.raise(
        parsErrors.errMissingComma,
        'syntaxAnalyser.Terminal',
        'Missing after IIF-condition',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
      return;
    }

    this.getNextSymbol();
    this.condition();

    const elsePC = this._code!.add(Opcodes.Jump);
    this._code!.fixUp(thenPC - 1, [this._code!.endOfCodePC]);

    if (this._symbol.token !== Tokens.tokComma) {
      this.interpreterError!.raise(
        parsErrors.errMissingComma,
        'syntaxAnalyser.Terminal',
        'Missing after true-value of IIF',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
      return;
    }

    this.getNextSymbol();
    this.condition();

    this._code!.fixUp(elsePC - 1, [this._code!.endOfCodePC]);

    if (this.currentToken === Tokens.tokRightParent) {
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
  }
}
