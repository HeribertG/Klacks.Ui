// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Identifier, IdentifierTypes } from './identifier';
import { ScriptValue } from './script-value';

export class Entry {
  constructor(
    public key: string,
    public value: ScriptValue | Identifier
  ) {}
}

export class Scope {
  private _variables: Entry[] = [];

  allocate(
    name: string,
    value: ScriptValue = ScriptValue.Null,
    idType: IdentifierTypes = IdentifierTypes.idVariable
  ): Identifier {
    const id = new Identifier();
    id.name = name;
    id.value = value;
    id.idType = idType;
    this.setVariable(id, name);
    return id;
  }

  assign(name: string, value: ScriptValue): boolean {
    const variable = this.getVariable(name);
    if (variable) {
      variable.value = value;
      return true;
    }
    return false;
  }

  retrieve(name: string): Identifier | null {
    const result = this._variables.find((x) => x.key === name);
    if (result && result.value instanceof Identifier) {
      return result.value;
    }
    return null;
  }

  exists(name: string): boolean {
    return this._variables.some((x) => x.key === name);
  }

  getVariable(name: string): Identifier | null {
    if (this._variables.length === 0) {
      return null;
    }

    const result = this._variables.find((x) => x.key === name);
    if (result && result.value instanceof Identifier) {
      return result.value;
    }
    return null;
  }

  setVariable(value: Identifier, name: string): void {
    const existingIndex = this._variables.findIndex((x) => x.key === name);
    if (existingIndex >= 0) {
      this._variables.splice(existingIndex, 1);
    }

    const entry = new Entry(name, value);
    if (this._variables.length === 0) {
      this._variables.push(entry);
    } else {
      this._variables.unshift(entry);
    }
  }

  push(value: ScriptValue): void {
    const entry = new Entry('', value);
    this._variables.push(entry);
  }

  pop(index = -1): Entry | null {
    if (this._variables.length === 0) {
      return null;
    }

    if (index < 0) {
      return this._variables.pop() ?? null;
    } else {
      const length = this._variables.length - 1;
      const idx = length - index;
      if (idx >= 0 && idx < this._variables.length) {
        return this._variables[idx];
      }
      return null;
    }
  }

  cloneCount(): number {
    return this._variables.length;
  }

  cloneItem(index: number): Identifier | null {
    const entry = this._variables[index];
    if (entry && entry.value instanceof Identifier) {
      return entry.value;
    }
    return null;
  }
}
