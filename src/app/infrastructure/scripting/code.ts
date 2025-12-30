import { Scopes } from './scopes';
import { Scope, Entry } from './scope';
import { InterpreterError, runErrors } from './interpreterError';
import { Identifier, IdentifierTypes } from './identifier';
import { StringInputStream } from './stringInput';
import { Opcodes } from './opcodes';
import { ScriptValue } from './script-value';

export { Opcodes };

export class Results {
  constructor(
    public type: number | undefined,
    public message: string
  ) {}
}

export class Code {
  private code: unknown[][] = [];
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

  codeStack(): unknown[][] {
    return this.code;
  }

  importAdd(
    name: string,
    value: ScriptValue = ScriptValue.Null,
    idType = IdentifierTypes.idVariable
  ): Identifier {
    return this._external.allocate(name, value, idType);
  }

  importItem(name: string, value: ScriptValue = ScriptValue.Null) {
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

  importRead(name: string): Identifier | null {
    return this._external.retrieve(name);
  }

  external(): Scope {
    return this._external;
  }

  clone(): Code {
    const result = new Code(this.interpreterError, this.stringInput);

    for (let i = 0; i < this.code.length; i++) {
      result.cloneAdd(this.code[i]);
    }

    for (let i = 0; i < this._external.cloneCount(); i++) {
      const item = this._external.cloneItem(i);
      if (item) {
        result.importAdd(item.name);
      }
    }

    return result;
  }

  private cloneAdd(value: unknown[]) {
    this.code.push(value);
  }

  add(opCode: Opcodes, parameters: unknown = null): number {
    let isArray = true;
    let length = 0;
    let operation: unknown[];
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
    if (parameters !== undefined && isArray && Array.isArray(parameters)) {
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

  fixUp(index: number, parameters: unknown[]) {
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
    let operation: unknown[];
    let startTime: number;
    this.scopes = new Scopes();
    this.scopes.pushScope(this._external);
    this.scopes.pushScope();
    startTime = this.getTickCount();
    this.cancelled = false;
    this.isRunning = true;
    this.pc = 0;
    const continues = false;

    this._hasNewDebugInfos = false;

    while (this.pc <= this.code.length - 1 && this.isRunning) {
      operation = this.code[this.pc];

      switch (operation[0] as Opcodes) {
        case Opcodes.AllocConst:
          this.scopes.allocate(
            String(operation[1]),
            ScriptValue.fromObject(operation[2]),
            IdentifierTypes.idConst
          );
          break;
        case Opcodes.AllocVar:
          this.scopes.allocate(String(operation[1]));
          break;
        case Opcodes.PushValue:
          this.scopes.push(ScriptValue.fromObject(operation[1]));
          break;
        case Opcodes.PushVariable:
          try {
            const register = this.scopes.retrieve(String(operation[1]));

            if (register === null) {
              this.isRunning = false;
              this.interpreterError!.raise(
                runErrors.errUninitializedVar,
                'code.run',
                'Variable ' + operation[1] + ' hasn\'t been assigned a value yet',
                0,
                0,
                0
              );
              break;
            }

            this.scopes.push(register.value);
          } catch {
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
          break;
        case Opcodes.Pop:
          this.scopes.pop();
          break;
        case Opcodes.PopWithIndex: {
          const entry = this.scopes.pop(Number(operation[1]));
          const value = this.extractValueFromEntry(entry);
          this.scopes.push(value);
          break;
        }
        case Opcodes.Assign:
          try {
            const entry = this.scopes.pop();
            const value = this.extractValueFromEntry(entry);
            const name = String(operation[1]);

            if (!this.scopes.assign(name, value)) {
              this.scopes.allocate(name, value);
            }
          } catch {
            // Variable doesn't exist, allocate it
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
        case Opcodes.DebugPrint: {
          const entry = this.scopes.pop();
          const value = this.extractValueFromEntry(entry);
          this.debugPrint(value.asString());
          break;
        }
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
            const msgEntry = this.scopes.pop();
            const typeEntry = this.scopes.pop();

            const msg = this.extractValueFromEntry(msgEntry).asString();
            const type = this.extractValueFromEntry(typeEntry).asInt();

            this.message(type, msg);
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
          } else {
            this.scopes.pop(); // buttons
            this.scopes.pop(); // title
            const msgEntry = this.scopes.pop();
            const msg = this.extractValueFromEntry(msgEntry).asString();
            this.scopes.push(ScriptValue.fromInt(this.msgBox(msg)));
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
          } else {
            this.scopes.pop(); // yPos
            this.scopes.pop(); // xPos
            const defaultEntry = this.scopes.pop();
            this.scopes.pop(); // title
            const questionEntry = this.scopes.pop();

            const question = this.extractValueFromEntry(questionEntry).asString();
            const defaultResponse = this.extractValueFromEntry(defaultEntry).asString();
            const answer = this.inputBox(question, defaultResponse);

            if (answer !== null) {
              this.scopes.push(ScriptValue.fromString(answer));
            } else {
              this.scopes.push(ScriptValue.fromString(''));
              this.isRunning = false;
              this.interpreterError!.raise(
                runErrors.errMath,
                'Code.Run',
                'Cancel Inputbox call',
                0,
                0,
                0
              );
            }
          }
          break;
        case Opcodes.Jump:
          this.pc = (operation[1] as number) - 1;
          break;

        case Opcodes.JumpTrue: {
          const entry = this.scopes.pop();
          const value = this.extractValueFromEntry(entry);
          if (value.asBoolean()) {
            this.pc = (operation[1] as number) - 1;
          }
          break;
        }

        case Opcodes.JumpFalse: {
          const entry = this.scopes.pop();
          const value = this.extractValueFromEntry(entry);
          if (!value.asBoolean()) {
            this.pc = (operation[1] as number) - 1;
          }
          break;
        }
        case Opcodes.JumpPop: {
          const entry = this.scopes.pop();
          const value = this.extractValueFromEntry(entry);
          this.pc = value.asInt() - 1;
          break;
        }
        case Opcodes.PushScope:
          this.scopes.pushScope();
          break;
        case Opcodes.PopScope:
          this.scopes.popScope();
          break;
        case Opcodes.Call:
          this.scopes.allocate(
            '~RETURNADDR',
            ScriptValue.fromInt(this.pc + 1),
            IdentifierTypes.idConst
          );
          this.pc = (operation[1] as number) - 1;
          break;
        case Opcodes.Return: {
          const returnAddr = this.scopes.retrieve('~RETURNADDR');
          if (returnAddr) {
            this.pc = returnAddr.value.asInt() - 1;
          }
          break;
        }
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

  private extractValueFromEntry(entry: Entry | null): ScriptValue {
    if (entry === null) return ScriptValue.Null;
    if (entry.value instanceof ScriptValue) return entry.value;
    if (entry.value instanceof Identifier) return entry.value.value;
    return ScriptValue.fromObject(entry.value);
  }

  private extractDouble(entry: Entry | null): number {
    return this.extractValueFromEntry(entry).asDouble();
  }

  private extractString(entry: Entry | null): string {
    return this.extractValueFromEntry(entry).asString();
  }

  private binaryMathOperators(operation: unknown[]) {
    const registerEntry = this.scopes.pop();
    const accumulatorEntry = this.scopes.pop();

    if (registerEntry === null || accumulatorEntry === null) {
      return;
    }

    try {
      const register = this.extractDouble(registerEntry);
      const accumulator = this.extractDouble(accumulatorEntry);
      const registerStr = this.extractString(registerEntry);
      const accumulatorStr = this.extractString(accumulatorEntry);

      switch (operation[0] as Opcodes) {
        case Opcodes.Add:
          this.scopes.push(ScriptValue.fromNumber(accumulator + register));
          break;
        case Opcodes.Sub:
          this.scopes.push(ScriptValue.fromNumber(accumulator - register));
          break;
        case Opcodes.Multiplication:
          this.scopes.push(ScriptValue.fromNumber(accumulator * register));
          break;
        case Opcodes.Division:
          this.scopes.push(ScriptValue.fromNumber(accumulator / register));
          break;
        case Opcodes.Div:
          this.scopes.push(ScriptValue.fromInt(Math.floor(accumulator / register)));
          break;
        case Opcodes.Mod:
          this.scopes.push(ScriptValue.fromNumber(accumulator % register));
          break;
        case Opcodes.Power:
          this.scopes.push(ScriptValue.fromNumber(Math.pow(accumulator, register)));
          break;
        case Opcodes.StringConcat:
          this.scopes.push(ScriptValue.fromString(accumulatorStr + registerStr));
          break;
        case Opcodes.Or:
          this.scopes.push(ScriptValue.fromInt(Math.floor(accumulator) | Math.floor(register)));
          break;
        case Opcodes.And:
          this.scopes.push(ScriptValue.fromInt(Math.floor(accumulator) & Math.floor(register)));
          break;
        case Opcodes.Eq:
          this.scopes.push(ScriptValue.fromBoolean(accumulatorStr === registerStr));
          break;
        case Opcodes.NotEq:
          this.scopes.push(ScriptValue.fromBoolean(accumulatorStr !== registerStr));
          break;
        case Opcodes.Lt:
          this.scopes.push(ScriptValue.fromBoolean(accumulator < register));
          break;
        case Opcodes.LEq:
          this.scopes.push(ScriptValue.fromBoolean(accumulator <= register));
          break;
        case Opcodes.Gt:
          this.scopes.push(ScriptValue.fromBoolean(accumulator > register));
          break;
        case Opcodes.GEq:
          this.scopes.push(ScriptValue.fromBoolean(accumulator >= register));
          break;
      }
    } catch {
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

  private unaryMathOperators(operation: unknown[]) {
    const entry = this.scopes.pop();
    const value = this.extractDouble(entry);

    try {
      switch (operation[0] as Opcodes) {
        case Opcodes.Negate:
          this.scopes.push(ScriptValue.fromNumber(value * -1));
          break;
        case Opcodes.Not:
          this.scopes.push(ScriptValue.fromBoolean(!value));
          break;
        case Opcodes.Factorial:
          this.scopes.push(ScriptValue.fromNumber(this.factorial(value)));
          break;
        case Opcodes.Sin:
          this.scopes.push(ScriptValue.fromNumber(Math.sin(value)));
          break;
        case Opcodes.Cos:
          this.scopes.push(ScriptValue.fromNumber(Math.cos(value)));
          break;
        case Opcodes.Tan:
          this.scopes.push(ScriptValue.fromNumber(Math.tan(value)));
          break;
        case Opcodes.ATan:
          this.scopes.push(ScriptValue.fromNumber(Math.atan(value)));
          break;
      }
    } catch {
      this.isRunning = false;
      this.interpreterError!.raise(
        runErrors.errMath,
        'Code.Run',
        'Error during calculation unary op ' + String(operation[0]),
        0,
        0,
        0
      );
    }
  }

  private factorial(n: number): number {
    if (n <= 0) return 1;
    return n * this.factorial(n - 1);
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
    return Date.now();
  }
}
