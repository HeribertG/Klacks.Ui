/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Scopes } from './scopes';
import { Scope, Entry } from './scope';
import { InterpreterError, runErrors } from './interpreterError';

import { Identifier, IdentifierTypes } from './identifier';
import { StringInput } from './stringInput';

export enum Opcodes {
  opAllocConst,
  opAllocVar,
  opPushValue,
  opPushVariable,
  opPop,
  opPopWithIndex,
  opAssign,
  opAdd,
  opSub,
  opMultiplication,
  opDivision,
  opDiv,
  opMod,
  opPower,
  opStringConcat,
  opOr,
  opAnd,
  opEq,
  opNotEq,
  oplt,
  opLEq,
  opGt,
  opGEq,
  opNegate,
  opNot,
  opFactorial,
  opSin,
  opCos,
  opTan,
  opATan,
  opDebugPrint,
  opDebugClear,
  opDebugShow,
  opDebugHide,
  opMsgBox,
  opDoEvents,
  opInputBox,
  opJump,
  opJumpTrue,
  opJumpFalse,
  opJumpPop,
  opPushScope,
  opPopScope,
  opCall,
  opReturn,
  opMessage,
}

export class Results {
  constructor(public type: number | undefined, public message: string) {}
}

export class Code {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    private stringInput: StringInput | undefined
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  codeStack(): any[] {
    return this.code;
  }

  importAdd(
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any = null,
    idType = Identifier.IdentifierTypes.idVariable
  ): Identifier {
    return this._external.allocate(name, value, idType);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cloneAdd(value: any) {
    this.code.push(value);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  add(opCode: Opcodes, parameters: any = null): number {
    let isArray = true;
    let length = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      counter++;

      switch (operation[0] as Opcodes) {
        case Opcodes.opAllocConst:
          this.scopes.allocate(
            operation[1],
            operation[2],
            IdentifierTypes.idConst
          );
          break;
        case Opcodes.opAllocVar: // Variable allozieren
          this.scopes.allocate(operation[1]);
          break;
        case Opcodes.opPushValue: // Wert auf den Stack schieben
          this.scopes.push(operation[1]);
          break;
        case Opcodes.opPushVariable: //  Wert einer Variablen auf den Stack schieben
          try {
            register = this.scopes.retrieve(operation[1]); // Parameter:  Variablenname
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
        case Opcodes.opPop:
          this.scopes.pop();
          break;
        case Opcodes.opPopWithIndex: //  legt den n-ten Stackwert zuoberst auf den Stack
          register = this.scopes.pop(operation[1]);
          let result: any;
          if (register instanceof Entry) {
            result = (register as Entry).value;
          } else {
            result = register;
          }

          this.scopes.push(result); // Parameter:    Index in den Stack (von oben an gezählt: 0..n)
          break;
        case Opcodes.opAssign: // Wert auf dem Stack einer Variablen zuweisen
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
        case Opcodes.opAdd:
        case Opcodes.opSub:
        case Opcodes.opMultiplication:
        case Opcodes.opDivision:
        case Opcodes.opDiv:
        case Opcodes.opMod:
        case Opcodes.opPower:
        case Opcodes.opStringConcat:
        case Opcodes.opOr:
        case Opcodes.opAnd:
        case Opcodes.opEq:
        case Opcodes.opNotEq:
        case Opcodes.oplt:
        case Opcodes.opLEq:
        case Opcodes.opGt:
        case Opcodes.opGEq:
          this.binaryMathOperators(operation);
          break;
        case Opcodes.opNegate:
        case Opcodes.opNot:
        case Opcodes.opFactorial:
        case Opcodes.opSin:
        case Opcodes.opCos:
        case Opcodes.opTan:
        case Opcodes.opATan:
          this.unaryMathOperators(operation);
          break;
        case Opcodes.opDebugPrint:
          let msg = '';

          register = this.scopes.pop();

          if (register !== null) {
            msg = register.value;
          }
          this.debugPrint(msg);

          break;
        case Opcodes.opDebugClear:
          this.debugClear();
          break;
        case Opcodes.opDebugShow:
          this.debugShow();
          break;
        case Opcodes.opDebugHide:
          this.debugHide();
          break;
        case Opcodes.opMessage:
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
        case Opcodes.opMsgBox:
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

          register = this.scopes.pop(); // Title
          accumulator = this.scopes.pop(); // Buttons
          renamed = this.scopes.pop(); // Message

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
        case Opcodes.opDoEvents:
          break;
        case Opcodes.opInputBox:
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
        case Opcodes.opJump:
          this.pc = (operation[1] as number) - 1;
          break;

        case Opcodes.opJumpTrue:
          accumulator = this.scopes.pop();
          if (accumulator instanceof Entry) {
            if (accumulator.value === true) {
              this.pc = (operation[1] as number) - 1;
            }
          }
          break;

        case Opcodes.opJumpFalse:
          accumulator = this.scopes.pop();
          if (accumulator instanceof Entry) {
            if (accumulator.value === false) {
              this.pc = (operation[1] as number) - 1;
            }
          }
          break;
        case Opcodes.opJumpPop:
          this.pc = (this.scopes.pop() as number) - 1;
          break;
        case Opcodes.opPushScope:
          this.scopes.pushScope();
          break;
        case Opcodes.opPopScope:
          this.scopes.popScope();
          break;
        case Opcodes.opCall:
          this.scopes.allocate(
            '~RETURNADDR',
            this.pc + 1,
            IdentifierTypes.idConst
          );
          this.pc = (operation[1] as number) - 1;
          break;
        case Opcodes.opReturn:
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
  private binaryMathOperators(operation: any[]) {
    let tmpAccumulator: number;
    let tmpRegister: number;
    let tmpAccumulatorString = '';
    let tmpRegisterString = '';

    const register = this.scopes.pop();
    const accumulator = this.scopes.pop();

    if (register !== undefined && accumulator !== undefined) {
      try {
        switch (operation[0] as Opcodes) {
          case Opcodes.opAdd:
            tmpAccumulator = 0;

            if (accumulator instanceof Entry) {
              tmpAccumulator = parseFloat((accumulator as Entry).value);
            } else if (this.isNumeric(accumulator)) {
              tmpAccumulator = accumulator as number;
            }

            tmpRegister = 0;

            if (register instanceof Entry) {
              tmpRegister = parseFloat((register as Entry).value);
            } else if (this.isNumeric(register)) {
              tmpRegister = register as number;
            }

            this.scopes.push(tmpAccumulator + tmpRegister);
            break;
          case Opcodes.opSub:
            tmpAccumulator = 0;

            if (accumulator instanceof Entry) {
              tmpAccumulator = parseFloat((accumulator as Entry).value);
            } else if (this.isNumeric(accumulator)) {
              tmpAccumulator = accumulator as number;
            }

            tmpRegister = 0;

            if (register instanceof Entry) {
              tmpRegister = parseFloat((register as Entry).value);
            } else if (this.isNumeric(register)) {
              tmpRegister = register as number;
            }

            this.scopes.push(tmpAccumulator - tmpRegister);
            break;
          case Opcodes.opMultiplication:
            tmpAccumulator = 0;

            if (accumulator instanceof Entry) {
              tmpAccumulator = parseFloat((accumulator as Entry).value);
            } else if (this.isNumeric(accumulator)) {
              tmpAccumulator = accumulator as number;
            }

            tmpRegister = 0;

            if (register instanceof Entry) {
              tmpRegister = parseFloat((register as Entry).value);
            } else if (this.isNumeric(register)) {
              tmpRegister = register as number;
            }

            this.scopes.push(
              ((tmpAccumulator as number) * tmpRegister) as number
            );
            break;
          case Opcodes.opDivision:
            tmpAccumulator = 0;

            if (accumulator instanceof Entry) {
              tmpAccumulator = parseFloat((accumulator as Entry).value);
            } else if (this.isNumeric(accumulator)) {
              tmpAccumulator = accumulator as number;
            }

            tmpRegister = 0;

            if (register instanceof Entry) {
              tmpRegister = parseFloat((register as Entry).value);
            } else if (this.isNumeric(register)) {
              tmpRegister = register as number;
            }

            this.scopes.push(
              ((tmpAccumulator as number) / tmpRegister) as number
            );
            break;
          case Opcodes.opDiv:
            tmpAccumulator = 0;

            if (accumulator instanceof Entry) {
              tmpAccumulator = parseFloat((accumulator as Entry).value);
            } else if (this.isNumeric(accumulator)) {
              tmpAccumulator = accumulator as number;
            }

            tmpRegister = 0;

            if (register instanceof Entry) {
              tmpRegister = parseFloat((register as Entry).value);
            } else if (this.isNumeric(register)) {
              tmpRegister = register as number;
            }

            this.scopes.push(
              Math.floor((tmpAccumulator as number) / (tmpRegister as number))
            );
            break;
          case Opcodes.opMod:
            tmpAccumulator = 0;

            if (accumulator instanceof Entry) {
              tmpAccumulator = parseFloat((accumulator as Entry).value);
            } else if (this.isNumeric(accumulator)) {
              tmpAccumulator = accumulator as number;
            }

            tmpRegister = 0;

            if (register instanceof Entry) {
              tmpRegister = parseFloat((register as Entry).value);
            } else if (this.isNumeric(register)) {
              tmpRegister = register as number;
            }

            this.scopes.push(
              (tmpAccumulator as number) % (tmpRegister as number)
            );
            break;
          case Opcodes.opPower:
            tmpAccumulator = 0;

            if (accumulator instanceof Entry) {
              tmpAccumulator = parseFloat((accumulator as Entry).value);
            } else if (this.isNumeric(accumulator)) {
              tmpAccumulator = accumulator as number;
            }

            tmpRegister = 0;

            if (register instanceof Entry) {
              tmpRegister = parseFloat((register as Entry).value);
            } else if (this.isNumeric(register)) {
              tmpRegister = register as number;
            }

            this.scopes.push(
              Math.pow(tmpAccumulator as number, tmpRegister as number)
            );

            break;
          case Opcodes.opStringConcat:
            tmpAccumulatorString = '';

            if (accumulator instanceof Entry) {
              tmpAccumulatorString = (accumulator as Entry).value.toString();
            } else {
              tmpAccumulatorString = accumulator.toString();
            }

            tmpRegisterString = '';
            if (register instanceof Entry) {
              tmpRegisterString = (register as Entry).value.toString();
            } else {
              tmpRegisterString = register.toString();
            }

            this.scopes.push(tmpAccumulatorString + tmpRegisterString);
            break;
          case Opcodes.opOr:
            tmpAccumulator = 0;
            if (accumulator instanceof Entry) {
              tmpAccumulator = parseFloat((accumulator as Entry).value);
            } else if (this.isNumeric(accumulator)) {
              tmpAccumulator = accumulator as number;
            }

            tmpRegister = 0;
            if (register instanceof Entry) {
              tmpRegister = parseFloat((register as Entry).value);
            } else if (this.isNumeric(register)) {
              tmpRegister = register as number;
            }

            this.scopes.push(
              Math.pow(tmpAccumulator as number, tmpRegister as number)
            );
            break;
          case Opcodes.opAnd:
            tmpAccumulator = 0;
            if (accumulator instanceof Entry) {
              tmpAccumulator = parseFloat((accumulator as Entry).value);
            } else if (this.isNumeric(accumulator)) {
              tmpAccumulator = accumulator as number;
            }

            tmpRegister = 0;
            if (register instanceof Entry) {
              tmpRegister = parseFloat((register as Entry).value);
            } else if (this.isNumeric(register)) {
              tmpRegister = register as number;
            }

            this.scopes.push(
              (tmpAccumulator as number) + (tmpRegister as number)
            );
            break;
          case Opcodes.opEq:
            // =
            tmpAccumulatorString = '';
            if (accumulator instanceof Entry) {
              tmpAccumulatorString = (accumulator as Entry).value;
            } else {
              tmpAccumulatorString = accumulator;
            }

            tmpRegisterString = '';
            if (register instanceof Entry) {
              tmpRegisterString = (register as Entry).value;
            } else {
              tmpRegisterString = register;
            }

            this.scopes.push(tmpAccumulatorString === tmpRegisterString);
            break;
          case Opcodes.opNotEq:
            tmpAccumulatorString = '';
            if (accumulator instanceof Entry) {
              tmpAccumulatorString = (accumulator as Entry).value;
            } else {
              tmpAccumulatorString = accumulator;
            }

            tmpRegisterString = '';
            if (register instanceof Entry) {
              tmpRegisterString = (register as Entry).value;
            } else if (!this.isNumeric(register)) {
              tmpRegisterString = register;
            }

            this.scopes.push(tmpAccumulatorString !== tmpRegisterString);
            break;
          case Opcodes.oplt:
            // <
            tmpAccumulator = 0;

            if (accumulator instanceof Entry) {
              tmpAccumulator = parseFloat((accumulator as Entry).value);
            } else if (this.isNumeric(accumulator)) {
              tmpAccumulator = accumulator as number;
            }

            tmpRegister = 0;

            if (register instanceof Entry) {
              tmpRegister = parseFloat((register as Entry).value);
            } else if (this.isNumeric(register)) {
              tmpRegister = register as number;
            }

            this.scopes.push(tmpAccumulator < tmpRegister);
            break;
          case Opcodes.opLEq:
            tmpAccumulator = 0;

            if (accumulator instanceof Entry) {
              tmpAccumulator = parseFloat((accumulator as Entry).value);
            } else if (this.isNumeric(accumulator)) {
              tmpAccumulator = accumulator as number;
            }

            tmpRegister = 0;

            if (register instanceof Entry) {
              tmpRegister = parseFloat((register as Entry).value);
            } else if (this.isNumeric(register)) {
              tmpRegister = register as number;
            }

            this.scopes.push(tmpAccumulator <= tmpRegister);
            break;
          case Opcodes.opGt:
            tmpAccumulator = 0;

            if (accumulator instanceof Entry) {
              tmpAccumulator = parseFloat((accumulator as Entry).value);
            } else if (this.isNumeric(accumulator)) {
              tmpAccumulator = accumulator as number;
            }

            tmpRegister = 0;
            if (register instanceof Entry) {
              tmpRegister = parseFloat((register as Entry).value);
            } else if (this.isNumeric(register)) {
              tmpRegister = register as number;
            }

            this.scopes.push(tmpAccumulator > tmpRegister);
            break;
          case Opcodes.opGEq:
            tmpAccumulator = 0;

            if (accumulator instanceof Entry) {
              tmpAccumulator = parseFloat((accumulator as Entry).value);
            } else if (this.isNumeric(accumulator)) {
              tmpAccumulator = accumulator as number;
            }

            tmpRegister = 0;

            if (register instanceof Entry) {
              tmpRegister = parseFloat((register as Entry).value);
            } else if (this.isNumeric(register)) {
              tmpRegister = register as number;
            }

            this.scopes.push(tmpAccumulator >= tmpRegister);
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
  }

  private unaryMathOperators(operation: any[]) {
    let tmpAccumulator = 0;
    const accumulator = this.scopes.pop();

    if (accumulator instanceof Entry) {
      tmpAccumulator = parseFloat((accumulator as Entry).value);
    } else if (this.isNumeric(accumulator)) {
      tmpAccumulator = accumulator as number;
    }
    try {
      switch (operation[0] as Opcodes) {
        case Opcodes.opNegate:
          this.scopes.push(tmpAccumulator * -1);
          break;
        case Opcodes.opNot:
          this.scopes.push(!(tmpAccumulator as number));
          break;
        case Opcodes.opFactorial:
          this.scopes.push(this.factorial(tmpAccumulator as number));
          break;
        case Opcodes.opSin:
          this.scopes.push(Math.sin(tmpAccumulator as number));
          break;
        case Opcodes.opCos:
          this.scopes.push(Math.cos(tmpAccumulator as number));
          break;
        case Opcodes.opTan:
          this.scopes.push(Math.tan(tmpAccumulator as number));
          break;
        case Opcodes.opATan:
          this.scopes.push(Math.atan(tmpAccumulator as number));
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
