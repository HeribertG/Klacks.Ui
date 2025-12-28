/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Scopes } from './scopes';
import { Scope, Entry } from './scope';
import { InterpreterError, runErrors } from './interpreterError';

import { Identifier, IdentifierTypes } from './identifier';
import { StringInputStream } from './stringInput';

export enum Opcodes {
  AllocConst = 0,
  AllocVar = 1,
  PushValue = 2,
  PushVariable = 3,
  Pop = 4,
  PopWithIndex = 5,
  Assign = 6,
  Add = 7,
  Sub = 8,
  Multiplication = 9,
  Division = 10,
  Div = 11,
  Mod = 12,
  Power = 13,
  StringConcat = 14,
  Or = 15,
  And = 16,
  Eq = 17,
  NotEq = 18,
  Lt = 19,
  LEq = 20,
  Gt = 21,
  GEq = 22,
  Negate = 23,
  Not = 24,
  Factorial = 25,
  Sin = 26,
  Cos = 27,
  Tan = 28,
  ATan = 29,
  DebugPrint = 30,
  DebugClear = 31,
  DebugShow = 32,
  DebugHide = 33,
  Msgbox = 34,
  DoEvents = 35,
  Inputbox = 36,
  Jump = 37,
  JumpTrue = 38,
  JumpFalse = 39,
  JumpPop = 40,
  PushScope = 41,
  PopScope = 42,
  Call = 43,
  Return = 44,
  Message = 45,
}

export class Results {
  constructor(public type: number | undefined, public message: string) {}
}

export class Code {
  private code: any[] = [];
  private scopes: Scopes = new Scopes();
  private pc = -1;
  private _external: Scope = new Scope();
  private _allowUI = false;
  private _timeout = 60000;
  private cancelled = false;
  private isRunning = false;
  private _results: Results[] = [];
  private _resultsDebug: Results[] = [];
  private _hasNewDebugInfos = false;

  constructor(
    private interpreterError: InterpreterError | undefined,
    private stringInput: StringInputStream | undefined
  ) {}

  dispose() {
    this.interpreterError = undefined;
    this.stringInput = undefined;
  }

  public get errorObject(): InterpreterError | undefined {
    return this.interpreterError;
  }

  public get allowUI(): boolean {
    return this._allowUI;
  }
  public set allowUI(value: boolean) {
    this._allowUI = value;
  }

  public get currentTimeout(): number {
    return this._timeout;
  }
  public set currentTimeout(value: number) {
    this._timeout = value;
  }

  public get cancel(): boolean {
    return this.cancelled;
  }
  public set cancel(value: boolean) {
    this.cancelled = value;
  }

  public get running(): boolean {
    return this.isRunning;
  }

  public get endOfCodePC(): number {
    return this.code.length;
  }

  public get hasNewDebugInfos(): boolean {
    return this._hasNewDebugInfos;
  }

  clearDebug() {
    this._resultsDebug = [];
  }
  clearMessage() {
    this._results = [];
  }
  result(): Results[] {
    return this._results;
  }

  debugResult(): Results[] {
    return this._resultsDebug;
  }

  codeStack(): any[] {
    return this.code;
  }

  importAdd(
    name: string,
    value: any = null,
    idType = IdentifierTypes.idVariable
  ): Identifier {
    return this._external.allocate(name, value, idType);
  }

  importItem(name: string, value: any = null) {
    this._external.assign(name, value);
  }

  importClear() {
    this._external = new Scope();
    this.code = [];
  }

  clear() {
    this.code = [];
    if (this.interpreterError) {
      this.interpreterError.clear();
    }
  }

  importRead(name: string): Identifier {
    return this._external.retrieve(name);
  }

  external(): Scope {
    return this._external;
  }

  clone(): Code {
    const result = new Code(this.interpreterError, this.stringInput);

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < this.code.length; i++) {
      result.cloneAdd(this.code[i]);
    }

    for (let i = 0; i < this._external.cloneCount(); i++) {
      result.importAdd(this._external.cloneItem(i).name);
    }

    return result;
  }

  private cloneAdd(value: any) {
    this.code.push(value);
  }

  add(opCode: Opcodes, parameters: any = null): number {
    let isArray = true;
    let length = 0;
    let operation: any[];
    if (parameters === null || parameters === undefined) {
      operation = Array(1);
    } else {
      if (Array.isArray(parameters)) {
        length = parameters.length;
        operation = Array(length);
      } else {
        isArray = false;
        length = 1;
        operation = Array(2);
      }
    }

    operation[0] = opCode;
    if (parameters !== undefined && isArray) {
      for (let i = 0; i <= length - 1; i++) {
        operation[i + 1] = parameters[i];
      }
    } else {
      if (parameters !== undefined) {
        operation[1] = parameters;
      }
    }

    this.code.push(operation);

    return this.code.length;
  }

  fixUp(index: number, parameters: any[]) {
    const length = parameters.length;
    const operation = Array(length + 1);

    operation[0] = this.code[index][0];
    for (let i = 0; i <= length - 1; i++) {
      operation[i + 1] = parameters[i];
    }

    this.code.splice(index, 1);
    if (index > this.code.length) {
      this.code.push(operation);
    } else {
      this.code.splice(index, 0, operation);
    }
  }

  interpret() {
    let operation: any[];
    let accumulator: any;
    let register: any;
    let startTime: number;
    this.scopes = new Scopes();
    this.scopes.pushScope(this._external);
    this.scopes.pushScope();
    startTime = this.getTickCount();
    this.cancelled = false;
    this.isRunning = true;
    this.pc = 0;
    let accepted: boolean;
    const continues = false;
    let xPos: any;
    let renamed: any;
    let yPos: any;
    let counter = 0;

    this._hasNewDebugInfos = false;

    while (this.pc <= this.code.length - 1 && this.isRunning) {
      accumulator = undefined;
      register = undefined;
      operation = this.code[this.pc];
      counter++;

      switch (operation[0] as Opcodes) {
        case Opcodes.AllocConst:
          this.scopes.allocate(
            operation[1],
            operation[2],
            IdentifierTypes.idConst
          );
          break;
        case Opcodes.AllocVar:
          this.scopes.allocate(operation[1]);
          break;
        case Opcodes.PushValue:
          this.scopes.push(operation[1]);
          break;
        case Opcodes.PushVariable:
          try {
            register = this.scopes.retrieve(operation[1]);
          } catch {
            accepted = false;
            this.retrieve();
            if (!accepted) {
              this.isRunning = false;
              this.interpreterError!.raise(
                runErrors.errUnknownVar,
                'code.run',
                'Unknown variable ' + operation[1],
                0,
                0,
                0
              );
            }
          }

          if (register === null) {
            this.isRunning = false;
            this.interpreterError!.raise(
              runErrors.errUninitializedVar,
              'code.run',
              'Variable ' +
                operation[1] +
                ' not hasn´t been assigned a value yet',
              0,
              0,
              0
            );
          }

          this.scopes.push(register.value);
          break;
        case Opcodes.Pop:
          this.scopes.pop();
          break;
        case Opcodes.PopWithIndex:
          register = this.scopes.pop(operation[1]);
          let result: any;
          if (register instanceof Entry) {
            result = (register as Entry).value;
          } else {
            result = register;
          }

          this.scopes.push(result);
          break;
        case Opcodes.Assign:
          try {
            register = this.scopes.pop();
            let result1: any;
            if (register instanceof Entry) {
              result1 = (register as Entry).value;
            } else {
              result1 = register;
            }

            this.scopes.assign(operation[1], result1);
          } catch {
            accepted = false;
            this.assign();
            if (!accepted) {
              this.scopes.allocate(operation[1], register);
            }
          }
          break;
        case Opcodes.Add:
        case Opcodes.Sub:
        case Opcodes.Multiplication:
        case Opcodes.Division:
        case Opcodes.Div:
        case Opcodes.Mod:
        case Opcodes.Power:
        case Opcodes.StringConcat:
        case Opcodes.Or:
        case Opcodes.And:
        case Opcodes.Eq:
        case Opcodes.NotEq:
        case Opcodes.Lt:
        case Opcodes.LEq:
        case Opcodes.Gt:
        case Opcodes.GEq:
          this.binaryMathOperators(operation);
          break;
        case Opcodes.Negate:
        case Opcodes.Not:
        case Opcodes.Factorial:
        case Opcodes.Sin:
        case Opcodes.Cos:
        case Opcodes.Tan:
        case Opcodes.ATan:
          this.unaryMathOperators(operation);
          break;
        case Opcodes.DebugPrint:
          let msg = '';

          register = this.scopes.pop();

          if (register !== null) {
            msg = register.value;
          }
          this.debugPrint(msg);

          break;
        case Opcodes.DebugClear:
          this.debugClear();
          break;
        case Opcodes.DebugShow:
          this.debugShow();
          break;
        case Opcodes.DebugHide:
          this.debugHide();
          break;
        case Opcodes.Message:
          try {
            let msg = '';
            let type: number | undefined;
            register = this.scopes.pop().value;
            accumulator = this.scopes.pop().value;

            if (register !== undefined && register !== '') {
              type = accumulator as number;
              msg = register;
            } else {
              type = undefined;
              msg = accumulator;
            }

            this.message(type!, msg);
          } catch {
            this.message(-1, '');
          }
          break;
        case Opcodes.Msgbox:
          if (!this.allowUI) {
            this.isRunning = false;
            this.interpreterError!.raise(
              runErrors.errNoUIAllowed,
              'code.run',
              'MsgBox-Statement cannot be executed when no UI-elements are allowed',
              0,
              0,
              0
            );
          }

          register = this.scopes.pop();
          accumulator = this.scopes.pop();
          renamed = this.scopes.pop();

          try {
            const message = renamed.value;
            this.scopes.push(this.msgBox(message));
          } catch {
            this.isRunning = false;
            this.interpreterError!.raise(
              runErrors.errMath,
              'Code.Run',
              'Error during MsgBox-call ',
              0,
              0,
              0
            );
          }

          break;
        case Opcodes.DoEvents:
          break;
        case Opcodes.Inputbox:
          if (!this.allowUI) {
            this.isRunning = false;
            this.interpreterError!.raise(
              runErrors.errNoUIAllowed,
              'Code.Run',
              'Inputbox-Statement cannot be executed when no UI-elements are allowed',
              0,
              0,
              0
            );
          }

          yPos = this.scopes.pop();
          xPos = this.scopes.pop();
          renamed = this.scopes.pop();
          register = this.scopes.pop();
          accumulator = this.scopes.pop();
          try {
            const question = accumulator.value;
            const defaultResponse = renamed.value;
            const answer: string = this.inputBox(question, defaultResponse);
            if (answer !== null) {
              this.scopes.push(answer);
            } else {
              this.scopes.push('');
              this.isRunning = false;
              this.interpreterError!.raise(
                runErrors.errMath,
                'Code.Run',
                ' Cancel Inputbox call: ',
                0,
                0,
                0
              );
            }
          } catch (ex) {
            this.isRunning = false;
            this.interpreterError!.raise(
              runErrors.errMath,
              'Code.Run',
              'Error during InputBox-call: ',
              0,
              0,
              0
            );
          }
          break;
        case Opcodes.Jump:
          this.pc = (operation[1] as number) - 1;
          break;

        case Opcodes.JumpTrue:
          accumulator = this.scopes.pop();
          if (accumulator instanceof Entry) {
            if (accumulator.value === true) {
              this.pc = (operation[1] as number) - 1;
            }
          }
          break;

        case Opcodes.JumpFalse:
          accumulator = this.scopes.pop();
          if (accumulator instanceof Entry) {
            if (accumulator.value === false) {
              this.pc = (operation[1] as number) - 1;
            }
          }
          break;
        case Opcodes.JumpPop:
          this.pc = (this.scopes.pop() as number) - 1;
          break;
        case Opcodes.PushScope:
          this.scopes.pushScope();
          break;
        case Opcodes.PopScope:
          this.scopes.popScope();
          break;
        case Opcodes.Call:
          this.scopes.allocate(
            '~RETURNADDR',
            this.pc + 1,
            IdentifierTypes.idConst
          );
          this.pc = (operation[1] as number) - 1;
          break;
        case Opcodes.Return:
          this.pc = this.scopes.retrieve('~RETURNADDR').value - 1;
          break;
      }

      this.pc += 1;

      if (this.cancelled) {
        this.isRunning = false;
        this.interpreterError!.raise(
          runErrors.errCancelled,
          'Code.Run',
          'Code execution aborted',
          0,
          0,
          0
        );
      }

      if (
        this._timeout > 0 &&
        this.getTickCount() - startTime >= this._timeout
      ) {
        if (this.allowUI) {
          this.timeout();
        }

        if (continues) {
          startTime = this.getTickCount();
        } else {
          this.isRunning = false;
          this.interpreterError!.raise(
            runErrors.errTimedOut,
            'Code.Run',
            'Timeout reached: code execution has been aborted',
            0,
            0,
            0
          );
        }
      }
    }

    this.isRunning = false;
  }

  isNumeric(value: any): boolean {
    return typeof value === 'number';
  }

  private extractDouble(value: any): number {
    if (value instanceof Entry) {
      return parseFloat((value as Entry).value);
    } else if (this.isNumeric(value)) {
      return value as number;
    }
    return 0;
  }

  private extractString(value: any): string {
    if (value instanceof Entry) {
      return (value as Entry).value?.toString() ?? '';
    }
    return value?.toString() ?? '';
  }

  private extractValue(value: any): any {
    if (value instanceof Entry) {
      return (value as Entry).value;
    }
    return value;
  }

  private binaryMathOperators(operation: any[]) {
    const register = this.scopes.pop();
    const accumulator = this.scopes.pop();

    if (register === undefined || accumulator === undefined) {
      return;
    }

    try {
      switch (operation[0] as Opcodes) {
        case Opcodes.Add:
          this.scopes.push(this.extractDouble(accumulator) + this.extractDouble(register));
          break;
        case Opcodes.Sub:
          this.scopes.push(this.extractDouble(accumulator) - this.extractDouble(register));
          break;
        case Opcodes.Multiplication:
          this.scopes.push(this.extractDouble(accumulator) * this.extractDouble(register));
          break;
        case Opcodes.Division:
          this.scopes.push(this.extractDouble(accumulator) / this.extractDouble(register));
          break;
        case Opcodes.Div:
          this.scopes.push(Math.floor(this.extractDouble(accumulator) / this.extractDouble(register)));
          break;
        case Opcodes.Mod:
          this.scopes.push(this.extractDouble(accumulator) % this.extractDouble(register));
          break;
        case Opcodes.Power:
          this.scopes.push(Math.pow(this.extractDouble(accumulator), this.extractDouble(register)));
          break;
        case Opcodes.StringConcat:
          this.scopes.push(this.extractString(accumulator) + this.extractString(register));
          break;
        case Opcodes.Or:
          this.scopes.push(Math.pow(this.extractDouble(accumulator), this.extractDouble(register)));
          break;
        case Opcodes.And:
          this.scopes.push(this.extractDouble(accumulator) + this.extractDouble(register));
          break;
        case Opcodes.Eq:
          this.scopes.push(this.extractValue(accumulator) === this.extractValue(register));
          break;
        case Opcodes.NotEq:
          this.scopes.push(this.extractValue(accumulator) !== this.extractValue(register));
          break;
        case Opcodes.Lt:
          this.scopes.push(this.extractDouble(accumulator) < this.extractDouble(register));
          break;
        case Opcodes.LEq:
          this.scopes.push(this.extractDouble(accumulator) <= this.extractDouble(register));
          break;
        case Opcodes.Gt:
          this.scopes.push(this.extractDouble(accumulator) > this.extractDouble(register));
          break;
        case Opcodes.GEq:
          this.scopes.push(this.extractDouble(accumulator) >= this.extractDouble(register));
          break;
      }
    } catch (ex) {
      this.isRunning = false;
      this.interpreterError!.raise(
        runErrors.errMath,
        'Code.Run',
        'Error during calculation binary op ' + operation[0],
        0,
        0,
        0
      );
    }
  }

  private unaryMathOperators(operation: any[]) {
    const value = this.extractDouble(this.scopes.pop());

    try {
      switch (operation[0] as Opcodes) {
        case Opcodes.Negate:
          this.scopes.push(value * -1);
          break;
        case Opcodes.Not:
          this.scopes.push(!value);
          break;
        case Opcodes.Factorial:
          this.scopes.push(this.factorial(value));
          break;
        case Opcodes.Sin:
          this.scopes.push(Math.sin(value));
          break;
        case Opcodes.Cos:
          this.scopes.push(Math.cos(value));
          break;
        case Opcodes.Tan:
          this.scopes.push(Math.tan(value));
          break;
        case Opcodes.ATan:
          this.scopes.push(Math.atan(value));
          break;
      }
    } catch (ex) {
      this.isRunning = false;
      this.interpreterError!.raise(
        runErrors.errMath,
        'Code.Run',
        'Error during calculation unary op ' + operation[0].toString(),
        0,
        0,
        0
      );
    }
  }

  private factorial(n: number): number {
    let result: number;
    if (n === 0) {
      result = 1;
    } else {
      result = n * this.factorial(n - 1);
    }
    return result;
  }

  private debugPrint(msg: string) {
    this._hasNewDebugInfos = true;

    const c = new Results(undefined, msg);

    this._resultsDebug.push(c);
  }

  private debugClear() {
    this._resultsDebug = [];
  }

  private debugShow() {}

  private debugHide() {}

  private assign() {}

  private retrieve() {}
  private timeout() {}

  private message(type: number, message: string) {
    const c = new Results(type, message);
    this._results.push(c);
  }

  private inputBox(msg: string, defaultResponse: string): string {
    return prompt(msg, defaultResponse) as string;
  }

  private msgBox(msg: string): number {
    try {
      alert(msg);
      return 1;
    } catch {
      return 0;
    }
  }

  private getTickCount(): number {
    return new Date().getMilliseconds();
  }
}
