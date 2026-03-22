// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Abstract base class for built-in functions of the syntax analyser.
 * Provides generic parsing methods for function calls with 0-N parameters.
 * @param opcode - The opcode of the built-in function to invoke
 * @param paramCount - Number of expected parameters (1=unary, 2=binary, etc.)
 */
import { Opcodes } from './code';
import { SyntaxAnalyserBase } from './syntaxAnalyserBase';
import { Tokens } from './symbol';
import { parsErrors } from './interpreterError';

export abstract class SyntaxAnalyserBuiltIns extends SyntaxAnalyserBase {
  protected callMsg(dropReturnValue: boolean) {
    this.actualOptionalParameter(0);
    this.actualOptionalParameter('');

    this._code!.add(Opcodes.Message);
    if (dropReturnValue) {
      this._code!.add(Opcodes.Pop);
    }
  }

  protected callMsgBox(dropReturnValue: boolean) {
    this.actualOptionalParameter('');
    this.actualOptionalParameter(0);
    this.actualOptionalParameter('Title');
    this._code!.add(Opcodes.Msgbox);
    if (dropReturnValue) {
      this._code!.add(Opcodes.Pop);
    }
  }

  protected callInputbox(dropReturnValue: boolean) {
    this.actualOptionalParameter('');
    this.actualOptionalParameter('Title');
    this.actualOptionalParameter('');
    this.actualOptionalParameter(20);
    this.actualOptionalParameter(20);
    this._code!.add(Opcodes.Inputbox);
    if (dropReturnValue) {
      this._code!.add(Opcodes.Pop);
    }
  }

  protected callNaryFunction(opcode: Opcodes, paramCount: number) {
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
    for (let i = 1; i < paramCount; i++) {
      if (this._symbol.token !== Tokens.tokComma) {
        this.interpreterError!.raise(
          parsErrors.errMissingComma,
          'SyntaxAnalyser.Terminal',
          'Missing comma between function parameters',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
        return;
      }
      this.getNextSymbol();
      this.condition();
    }
    if ((this._symbol.token as Tokens) !== Tokens.tokRightParent) {
      this.interpreterError!.raise(
        parsErrors.errMissingClosingParent,
        'SyntaxAnalyser.Terminal',
        'Missing closing bracket after function parameters',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
      return;
    }
    this.getNextSymbol();
    this._code!.add(opcode);
  }

  protected callUnaryFunction(opcode: Opcodes) {
    this.callNaryFunction(opcode, 1);
  }

  protected callBinaryFunction(opcode: Opcodes) {
    this.callNaryFunction(opcode, 2);
  }

  protected callTernaryFunction(opcode: Opcodes) {
    this.callNaryFunction(opcode, 3);
  }

  protected callQuaternaryFunction(opcode: Opcodes) {
    this.callNaryFunction(opcode, 4);
  }

  protected callRnd() {
    if (this.getNextSymbol().token !== Tokens.tokLeftParent) {
      this.interpreterError!.raise(
        parsErrors.errMissingLeftParent,
        'SyntaxAnalyser.Terminal',
        'Missing opening bracket after Rnd',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
      return;
    }
    if (this.getNextSymbol().token !== Tokens.tokRightParent) {
      this.interpreterError!.raise(
        parsErrors.errMissingClosingParent,
        'SyntaxAnalyser.Terminal',
        'Missing closing bracket - Rnd() takes no parameters',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
      return;
    }
    this.getNextSymbol();
    this._code!.add(Opcodes.Rnd);
  }

  protected callRoundFunction() {
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
    if (this._symbol.token === Tokens.tokComma) {
      this.getNextSymbol();
      this.condition();
    } else {
      this._code!.add(Opcodes.PushValue, [0]);
    }
    if (this._symbol.token !== Tokens.tokRightParent) {
      this.interpreterError!.raise(
        parsErrors.errMissingClosingParent,
        'SyntaxAnalyser.Terminal',
        'Missing closing bracket after function parameters',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
      return;
    }
    this.getNextSymbol();
    this._code!.add(Opcodes.Round);
  }
}
