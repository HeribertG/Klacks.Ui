import { Scope, Entry } from './scope';
import { Identifier, IdentifierTypes } from './identifier';
import { ScriptValue } from './script-value';

export class Scopes {
  private _scopes: Scope[] = [];

  pushScope(s?: Scope): void {
    if (s === undefined) {
      this._scopes.push(new Scope());
    } else {
      this._scopes.push(s);
    }
  }

  popScope(): Scope | null {
    if (this._scopes.length === 0) {
      return null;
    }
    return this._scopes.pop() ?? null;
  }

  allocate(
    name: string,
    value: ScriptValue = ScriptValue.Null,
    idType = IdentifierTypes.idVariable
  ): Identifier {
    return this._scopes[this._scopes.length - 1].allocate(name, value, idType);
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
    return this.getVariable(name);
  }

  exists(
    name: string,
    inCurrentScopeOnly = false,
    idType = IdentifierTypes.idNone
  ): boolean {
    const startIndex = inCurrentScopeOnly ? this._scopes.length - 1 : 0;

    for (let i = this._scopes.length - 1; i >= startIndex; i--) {
      const scope = this._scopes[i];
      const variable = scope.getVariable(name);

      if (variable && variable.name === name) {
        if (idType === IdentifierTypes.idNone) {
          return true;
        }

        if (idType === IdentifierTypes.idIsVariableOfFunction) {
          if (
            variable.idType === IdentifierTypes.idVariable ||
            variable.idType === IdentifierTypes.idFunction
          ) {
            return true;
          }
        } else if (idType === IdentifierTypes.idSubOfFunction) {
          if (
            variable.idType === IdentifierTypes.idSub ||
            variable.idType === IdentifierTypes.idFunction
          ) {
            return true;
          }
        } else if (variable.idType === idType) {
          return true;
        }
      }
    }
    return false;
  }

  push(value: ScriptValue): void {
    if (this._scopes.length > 0) {
      this._scopes[this._scopes.length - 1].push(value);
    }
  }

  pop(index = -1): Entry | null {
    if (this._scopes.length === 0) {
      return null;
    }

    const scope = this._scopes[this._scopes.length - 1];
    return scope.pop(index);
  }

  popScopes(): Entry | null {
    return this.pop();
  }

  private getVariable(name: string): Identifier | null {
    for (let i = this._scopes.length - 1; i >= 0; i--) {
      const variable = this._scopes[i].getVariable(name);
      if (variable) {
        return variable;
      }
    }
    return null;
  }
}
