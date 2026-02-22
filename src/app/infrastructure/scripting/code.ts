// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Scope } from './scope';
import { InterpreterError } from './interpreterError';
import { Identifier, IdentifierTypes } from './identifier';
import { StringInputStream } from './stringInput';
import { Opcodes } from './opcodes';
import { ScriptValue } from './script-value';

export { Opcodes };

export class Code {
  private code: unknown[][] = [];
  private _external: Scope = new Scope();

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

  public get endOfCodePC(): number {
    return this.code.length;
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

    for (const codeItem of this.code) {
      result.cloneAdd(codeItem);
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
}
