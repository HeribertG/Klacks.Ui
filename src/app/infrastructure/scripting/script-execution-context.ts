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
import {
  extractDouble,
  extractInt,
  extractString,
  extractBoolean,
} from './helper';

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
        return scriptResultFail(
          createScriptError(-1, ex.message, 0, 0),
          [...this.messages]
        );
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
        this.executeUnaryOp(opcode);
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
        if (++this.recursionDepth > ScriptExecutionContext.MAX_RECURSION_DEPTH) {
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
        this.raiseError(3, `Variable '${operation[1]}' has not been assigned a value`);
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
      this.raiseError(5, `Error during calculation (binary op ${opcode}): ${message}`);
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
        default:
          result = ScriptValue.Null;
      }

      this.scopes!.push(result);
    } catch (ex) {
      this.running = false;
      const message = ex instanceof Error ? ex.message : String(ex);
      this.raiseError(5, `Error during calculation (unary op ${opcode}): ${message}`);
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
}
