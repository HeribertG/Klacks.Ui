import { CompiledScript } from './compiled-script';
import { Identifier, IdentifierTypes } from './identifier';
import { Opcodes } from './opcodes';
import { createScriptError } from './script-error';
import {
  ResultMessage,
  ScriptResult,
  scriptResultFail,
  scriptResultOk,
} from './script-result';
import { ScriptValue } from './script-value';
import { Scope, Entry } from './scope';
import { Scopes } from './scopes';
import { extractDouble, extractInt, extractString } from './helper';

export type MessageEventHandler = (type: number, message: string) => void;
export type DebugPrintEventHandler = (msg: string) => void;
export type DebugClearEventHandler = () => void;
export type DebugShowEventHandler = () => void;
export type DebugHideEventHandler = () => void;

export class ScriptTooComplexException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScriptTooComplexException';
  }
}

export interface CancellationToken {
  isCancelled: boolean;
}

export class ScriptExecutionContext {
  private static readonly MAX_RECURSION_DEPTH = 1000;
  private static readonly MAX_INSTRUCTIONS = 1_000_000;

  private readonly script: CompiledScript;
  private readonly messages: ResultMessage[] = [];

  private scopes: Scopes | null = null;
  private pc = 0;
  private recursionDepth = 0;
  private running = false;
  private errorCode = 0;
  private errorDescription = '';
  private errorLine = 0;
  private errorCol = 0;

  onMessage: MessageEventHandler | null = null;
  onDebugPrint: DebugPrintEventHandler | null = null;
  onDebugClear: DebugClearEventHandler | null = null;
  onDebugShow: DebugShowEventHandler | null = null;
  onDebugHide: DebugHideEventHandler | null = null;

  allowUi = false;

  constructor(script: CompiledScript) {
    this.script = script;
  }

  execute(cancellationToken?: CancellationToken): ScriptResult {
    if (this.script.hasError) {
      return scriptResultFail(this.script.error!);
    }

    this.messages.length = 0;
    this.errorCode = 0;
    this.errorDescription = '';
    this.errorLine = 0;
    this.errorCol = 0;

    try {
      this.interpret(cancellationToken);

      if (this.errorCode !== 0) {
        return scriptResultFail(
          createScriptError(
            this.errorCode,
            this.errorDescription,
            this.errorLine,
            this.errorCol
          ),
          [...this.messages]
        );
      }

      return scriptResultOk([...this.messages]);
    } catch (ex) {
      if (ex instanceof ScriptTooComplexException) {
        return scriptResultFail(createScriptError(-1, ex.message, 0, 0), [
          ...this.messages,
        ]);
      }
      throw ex;
    }
  }

  private interpret(cancellationToken?: CancellationToken): void {
    this.scopes = new Scopes();

    const externalScope = new Scope();
    for (const [name, identifier] of this.script.externalSymbols) {
      externalScope.allocate(name, identifier.value, identifier.idType);
    }
    this.scopes.pushScope(externalScope);
    this.scopes.pushScope();

    this.running = true;
    this.recursionDepth = 0;
    this.pc = 0;

    const instructions = this.script.instructions;

    while (this.pc < instructions.length && this.running) {
      const operation = instructions[this.pc] as unknown[];
      this.executeInstruction(operation);

      this.pc++;

      if (this.pc > ScriptExecutionContext.MAX_INSTRUCTIONS) {
        this.running = false;
        throw new ScriptTooComplexException(
          `Maximum instruction count (${ScriptExecutionContext.MAX_INSTRUCTIONS}) exceeded`
        );
      }

      if (cancellationToken?.isCancelled) {
        this.running = false;
        this.raiseError(1, 'Script execution cancelled');
      }
    }

    this.running = false;
  }

  private executeInstruction(operation: unknown[]): void {
    const opcode = operation[0] as Opcodes;

    switch (opcode) {
      case Opcodes.AllocConst:
        this.scopes!.allocate(
          String(operation[1]),
          ScriptValue.fromObject(operation[2]),
          IdentifierTypes.idConst
        );
        break;

      case Opcodes.AllocVar:
        this.scopes!.allocate(String(operation[1]));
        break;

      case Opcodes.PushValue:
        this.scopes!.push(ScriptValue.fromObject(operation[1]));
        break;

      case Opcodes.PushVariable:
        this.executePushVariable(operation);
        break;

      case Opcodes.Pop:
        this.scopes!.popScopes();
        break;

      case Opcodes.PopWithIndex: {
        const entry = this.scopes!.pop(Number(operation[1]));
        const value = this.extractValueFromEntry(entry);
        this.scopes!.push(value);
        break;
      }

      case Opcodes.Assign:
        this.executeAssign(operation);
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
        this.executeBinaryOp(opcode);
        break;

      case Opcodes.Negate:
      case Opcodes.Not:
      case Opcodes.Factorial:
      case Opcodes.Sin:
      case Opcodes.Cos:
      case Opcodes.Tan:
      case Opcodes.ATan:
      case Opcodes.Abs:
      case Opcodes.Sqr:
      case Opcodes.Log:
      case Opcodes.Exp:
      case Opcodes.Sgn:
        this.executeUnaryOp(opcode);
        break;

      // String Functions
      case Opcodes.Len:
        this.executeLen();
        break;
      case Opcodes.Left:
        this.executeLeft();
        break;
      case Opcodes.Right:
        this.executeRight();
        break;
      case Opcodes.Mid:
        this.executeMid();
        break;
      case Opcodes.InStr:
        this.executeInStr();
        break;
      case Opcodes.Replace:
        this.executeReplace();
        break;
      case Opcodes.Trim:
        this.executeTrim();
        break;
      case Opcodes.UCase:
        this.executeUCase();
        break;
      case Opcodes.LCase:
        this.executeLCase();
        break;

      // Math Functions
      case Opcodes.Rnd:
        this.scopes!.push(ScriptValue.fromNumber(Math.random()));
        break;
      case Opcodes.Round:
        this.executeRound();
        break;

      // Time Functions
      case Opcodes.TimeToHours:
        this.executeTimeToHours();
        break;
      case Opcodes.TimeOverlap:
        this.executeTimeOverlap();
        break;

      case Opcodes.DebugPrint: {
        const entry = this.scopes!.popScopes();
        const value = this.extractValueFromEntry(entry);
        this.onDebugPrint?.(value.asString());
        break;
      }

      case Opcodes.DebugClear:
        this.onDebugClear?.();
        break;

      case Opcodes.DebugShow:
        this.onDebugShow?.();
        break;

      case Opcodes.DebugHide:
        this.onDebugHide?.();
        break;

      case Opcodes.Message:
        this.executeMessage();
        break;

      case Opcodes.Msgbox:
      case Opcodes.Inputbox:
        if (!this.allowUi) {
          this.running = false;
          this.raiseError(2, 'UI statements not allowed in this context');
        }
        break;

      case Opcodes.DoEvents:
        break;

      case Opcodes.Jump:
        this.pc = Number(operation[1]) - 1;
        break;

      case Opcodes.JumpTrue:
      case Opcodes.JumpFalse: {
        const entry = this.scopes!.popScopes();
        const value = this.extractValueFromEntry(entry);
        const condition = value.asBoolean();
        if (
          (opcode === Opcodes.JumpTrue && condition) ||
          (opcode === Opcodes.JumpFalse && !condition)
        ) {
          this.pc = Number(operation[1]) - 1;
        }
        break;
      }

      case Opcodes.JumpPop: {
        const entry = this.scopes!.popScopes();
        const value = this.extractValueFromEntry(entry);
        this.pc = value.asInt() - 1;
        break;
      }

      case Opcodes.PushScope:
        this.scopes!.pushScope();
        break;

      case Opcodes.PopScope:
        this.scopes!.popScope();
        break;

      case Opcodes.Call:
        if (
          ++this.recursionDepth > ScriptExecutionContext.MAX_RECURSION_DEPTH
        ) {
          this.running = false;
          throw new ScriptTooComplexException(
            `Maximum recursion depth (${ScriptExecutionContext.MAX_RECURSION_DEPTH}) exceeded`
          );
        }
        this.scopes!.allocate(
          '~RETURNADDR',
          ScriptValue.fromInt(this.pc + 1),
          IdentifierTypes.idConst
        );
        this.pc = Number(operation[1]) - 1;
        break;

      case Opcodes.Return: {
        this.recursionDepth--;
        const returnAddr = this.scopes!.retrieve('~RETURNADDR');
        if (returnAddr) {
          this.pc = returnAddr.value.asInt() - 1;
        }
        break;
      }
    }
  }

  private executePushVariable(operation: unknown[]): void {
    try {
      const tmp = operation[1];
      const name =
        tmp instanceof Identifier ? tmp.value.asString() : String(tmp);
      const identifier = this.scopes!.retrieve(name);

      if (identifier === null) {
        this.running = false;
        this.raiseError(
          3,
          `Variable '${operation[1]}' has not been assigned a value`
        );
        return;
      }

      this.scopes!.push(identifier.value);
    } catch {
      this.running = false;
      this.raiseError(4, `Unknown variable '${operation[1]}'`);
    }
  }

  private executeAssign(operation: unknown[]): void {
    const entry = this.scopes!.pop();
    const value = this.extractValueFromEntry(entry);
    const name = String(operation[1]);

    if (!this.scopes!.assign(name, value)) {
      this.scopes!.allocate(name, value);
    }
  }

  private executeMessage(): void {
    try {
      const msgEntry = this.scopes!.popScopes();
      const typeEntry = this.scopes!.popScopes();

      const msg = this.extractValueFromEntry(msgEntry).asString();
      const type = this.extractValueFromEntry(typeEntry).asInt();

      this.onMessage?.(type, msg);

      if (msg && type > 0) {
        this.messages.push({ type, message: msg });
      }
    } catch {
      this.onMessage?.(-1, '');
    }
  }

  private executeBinaryOp(opcode: Opcodes): void {
    const registerEntry = this.scopes!.popScopes();
    const accumulatorEntry = this.scopes!.popScopes();

    const register = this.extractValueFromEntry(registerEntry);
    const accumulator = this.extractValueFromEntry(accumulatorEntry);

    try {
      let result: ScriptValue;

      switch (opcode) {
        case Opcodes.Add:
          result = ScriptValue.fromNumber(
            extractDouble(accumulator) + extractDouble(register)
          );
          break;
        case Opcodes.Sub:
          result = ScriptValue.fromNumber(
            extractDouble(accumulator) - extractDouble(register)
          );
          break;
        case Opcodes.Multiplication:
          result = ScriptValue.fromNumber(
            extractDouble(accumulator) * extractDouble(register)
          );
          break;
        case Opcodes.Division:
          result = ScriptValue.fromNumber(
            extractDouble(accumulator) / extractDouble(register)
          );
          break;
        case Opcodes.Div:
          result = ScriptValue.fromInt(
            Math.floor(extractInt(accumulator) / extractInt(register))
          );
          break;
        case Opcodes.Mod:
          result = ScriptValue.fromNumber(
            extractDouble(accumulator) % extractDouble(register)
          );
          break;
        case Opcodes.Power:
          result = ScriptValue.fromNumber(
            Math.pow(extractDouble(accumulator), extractDouble(register))
          );
          break;
        case Opcodes.StringConcat:
          result = ScriptValue.fromString(
            extractString(accumulator) + extractString(register)
          );
          break;
        case Opcodes.Or:
          result = ScriptValue.fromInt(
            extractInt(accumulator) | extractInt(register)
          );
          break;
        case Opcodes.And:
          result = ScriptValue.fromInt(
            extractInt(accumulator) & extractInt(register)
          );
          break;
        case Opcodes.Eq:
          result = ScriptValue.fromBoolean(
            extractString(accumulator) === extractString(register)
          );
          break;
        case Opcodes.NotEq:
          result = ScriptValue.fromBoolean(
            extractString(accumulator) !== extractString(register)
          );
          break;
        case Opcodes.Lt:
          result = ScriptValue.fromBoolean(
            extractDouble(accumulator) < extractDouble(register)
          );
          break;
        case Opcodes.LEq:
          result = ScriptValue.fromBoolean(
            extractDouble(accumulator) <= extractDouble(register)
          );
          break;
        case Opcodes.Gt:
          result = ScriptValue.fromBoolean(
            extractDouble(accumulator) > extractDouble(register)
          );
          break;
        case Opcodes.GEq:
          result = ScriptValue.fromBoolean(
            extractDouble(accumulator) >= extractDouble(register)
          );
          break;
        default:
          result = ScriptValue.Null;
      }

      this.scopes!.push(result);
    } catch (ex) {
      this.running = false;
      const message = ex instanceof Error ? ex.message : String(ex);
      this.raiseError(
        5,
        `Error during calculation (binary op ${opcode}): ${message}`
      );
    }
  }

  private executeUnaryOp(opcode: Opcodes): void {
    const entry = this.scopes!.popScopes();
    const value = this.extractValueFromEntry(entry);

    try {
      const number = value.asDouble();
      let result: ScriptValue;

      switch (opcode) {
        case Opcodes.Negate:
          result = ScriptValue.fromNumber(-number);
          break;
        case Opcodes.Not:
          result = ScriptValue.fromBoolean(!value.asBoolean());
          break;
        case Opcodes.Factorial:
          result = ScriptValue.fromNumber(this.factorial(Math.floor(number)));
          break;
        case Opcodes.Sin:
          result = ScriptValue.fromNumber(Math.sin(number));
          break;
        case Opcodes.Cos:
          result = ScriptValue.fromNumber(Math.cos(number));
          break;
        case Opcodes.Tan:
          result = ScriptValue.fromNumber(Math.tan(number));
          break;
        case Opcodes.ATan:
          result = ScriptValue.fromNumber(Math.atan(number));
          break;
        case Opcodes.Abs:
          result = ScriptValue.fromNumber(Math.abs(number));
          break;
        case Opcodes.Sqr:
          result = ScriptValue.fromNumber(Math.sqrt(number));
          break;
        case Opcodes.Log:
          result = ScriptValue.fromNumber(Math.log(number));
          break;
        case Opcodes.Exp:
          result = ScriptValue.fromNumber(Math.exp(number));
          break;
        case Opcodes.Sgn:
          result = ScriptValue.fromNumber(Math.sign(number));
          break;
        default:
          result = ScriptValue.Null;
      }

      this.scopes!.push(result);
    } catch (ex) {
      this.running = false;
      const message = ex instanceof Error ? ex.message : String(ex);
      this.raiseError(
        5,
        `Error during calculation (unary op ${opcode}): ${message}`
      );
    }
  }

  private factorial(n: number): number {
    if (n <= 1) return 1;
    return n * this.factorial(n - 1);
  }

  private extractValueFromEntry(entry: Entry | null): ScriptValue {
    if (entry === null) return ScriptValue.Null;
    if (entry.value instanceof ScriptValue) return entry.value;
    if (entry.value instanceof Identifier) return entry.value.value;
    return ScriptValue.fromObject(entry.value);
  }

  private raiseError(code: number, description: string): void {
    this.errorCode = code;
    this.errorDescription = description;
  }

  private executeLen(): void {
    const entry = this.scopes!.popScopes();
    const str = this.extractValueFromEntry(entry).asString();
    this.scopes!.push(ScriptValue.fromInt(str.length));
  }

  private executeLeft(): void {
    const lengthEntry = this.scopes!.popScopes();
    const strEntry = this.scopes!.popScopes();
    const length = this.extractValueFromEntry(lengthEntry).asInt();
    const str = this.extractValueFromEntry(strEntry).asString();
    const result = length >= str.length ? str : str.substring(0, length);
    this.scopes!.push(ScriptValue.fromString(result));
  }

  private executeRight(): void {
    const lengthEntry = this.scopes!.popScopes();
    const strEntry = this.scopes!.popScopes();
    const length = this.extractValueFromEntry(lengthEntry).asInt();
    const str = this.extractValueFromEntry(strEntry).asString();
    const result = length >= str.length ? str : str.substring(str.length - length);
    this.scopes!.push(ScriptValue.fromString(result));
  }

  private executeMid(): void {
    const lengthEntry = this.scopes!.popScopes();
    const startEntry = this.scopes!.popScopes();
    const strEntry = this.scopes!.popScopes();
    let length = this.extractValueFromEntry(lengthEntry).asInt();
    let start = this.extractValueFromEntry(startEntry).asInt() - 1;
    const str = this.extractValueFromEntry(strEntry).asString();
    if (start < 0) start = 0;
    if (start >= str.length) {
      this.scopes!.push(ScriptValue.fromString(''));
      return;
    }
    const actualLength = Math.min(length, str.length - start);
    this.scopes!.push(ScriptValue.fromString(str.substring(start, start + actualLength)));
  }

  private executeInStr(): void {
    const searchEntry = this.scopes!.popScopes();
    const strEntry = this.scopes!.popScopes();
    const search = this.extractValueFromEntry(searchEntry).asString();
    const str = this.extractValueFromEntry(strEntry).asString();
    const index = str.indexOf(search);
    this.scopes!.push(ScriptValue.fromInt(index + 1));
  }

  private executeReplace(): void {
    const replacementEntry = this.scopes!.popScopes();
    const searchEntry = this.scopes!.popScopes();
    const strEntry = this.scopes!.popScopes();
    const replacement = this.extractValueFromEntry(replacementEntry).asString();
    const search = this.extractValueFromEntry(searchEntry).asString();
    const str = this.extractValueFromEntry(strEntry).asString();
    this.scopes!.push(ScriptValue.fromString(str.split(search).join(replacement)));
  }

  private executeTrim(): void {
    const entry = this.scopes!.popScopes();
    const str = this.extractValueFromEntry(entry).asString();
    this.scopes!.push(ScriptValue.fromString(str.trim()));
  }

  private executeUCase(): void {
    const entry = this.scopes!.popScopes();
    const str = this.extractValueFromEntry(entry).asString();
    this.scopes!.push(ScriptValue.fromString(str.toUpperCase()));
  }

  private executeLCase(): void {
    const entry = this.scopes!.popScopes();
    const str = this.extractValueFromEntry(entry).asString();
    this.scopes!.push(ScriptValue.fromString(str.toLowerCase()));
  }

  private executeRound(): void {
    const decimalsEntry = this.scopes!.popScopes();
    const numberEntry = this.scopes!.popScopes();
    const decimals = this.extractValueFromEntry(decimalsEntry).asInt();
    const number = this.extractValueFromEntry(numberEntry).asDouble();
    const factor = Math.pow(10, decimals);
    this.scopes!.push(ScriptValue.fromNumber(Math.round(number * factor) / factor));
  }

  private executeTimeToHours(): void {
    const entry = this.scopes!.popScopes();
    const timeStr = this.extractValueFromEntry(entry).asString();
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        const decimalHours = hours + minutes / 60.0;
        this.scopes!.push(ScriptValue.fromNumber(decimalHours));
        return;
      }
    }
    this.scopes!.push(ScriptValue.fromNumber(0));
  }

  private executeTimeOverlap(): void {
    const inputEndStr = this.extractValueFromEntry(this.scopes!.popScopes()).asString();
    const inputStartStr = this.extractValueFromEntry(this.scopes!.popScopes()).asString();
    const segmentEndStr = this.extractValueFromEntry(this.scopes!.popScopes()).asString();
    const segmentStartStr = this.extractValueFromEntry(this.scopes!.popScopes()).asString();

    const segmentStart = this.parseTimeToMinutes(segmentStartStr);
    const segmentEnd = this.parseTimeToMinutes(segmentEndStr);
    const inputStart = this.parseTimeToMinutes(inputStartStr);
    const inputEnd = this.parseTimeToMinutes(inputEndStr);

    if (segmentStart < 0 || segmentEnd < 0 || inputStart < 0 || inputEnd < 0) {
      this.scopes!.push(ScriptValue.fromNumber(0));
      return;
    }

    const overlapMinutes = this.calculateOverlapMinutes(segmentStart, segmentEnd, inputStart, inputEnd);
    this.scopes!.push(ScriptValue.fromNumber(overlapMinutes / 60.0));
  }

  private parseTimeToMinutes(timeStr: string): number {
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        return hours * 60 + minutes;
      }
    }
    return -1;
  }

  private calculateOverlapMinutes(segStart: number, segEnd: number, inStart: number, inEnd: number): number {
    const dayMinutes = 24 * 60;
    const segCrossesMidnight = segEnd <= segStart;
    const inCrossesMidnight = inEnd <= inStart;

    if (segCrossesMidnight) {
      segEnd += dayMinutes;
    }
    if (inCrossesMidnight) {
      inEnd += dayMinutes;
    }

    let overlap = this.calculateSimpleOverlap(segStart, segEnd, inStart, inEnd);

    if (segCrossesMidnight && !inCrossesMidnight) {
      overlap += this.calculateSimpleOverlap(segStart - dayMinutes, segEnd - dayMinutes, inStart, inEnd);
    }
    if (inCrossesMidnight && !segCrossesMidnight) {
      overlap += this.calculateSimpleOverlap(segStart, segEnd, inStart - dayMinutes, inEnd - dayMinutes);
    }

    return overlap;
  }

  private calculateSimpleOverlap(start1: number, end1: number, start2: number, end2: number): number {
    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);
    return Math.max(0, overlapEnd - overlapStart);
  }
}
