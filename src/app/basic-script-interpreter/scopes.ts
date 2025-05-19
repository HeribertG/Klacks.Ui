import { Scope } from './scope';
import { Identifier, IdentifierTypes } from './identifier';

export class Scopes {
  private _scopes: Scope[] = new Array<Scope>();

  public pushScope(s: Scope | undefined = undefined) {
    if (s === undefined) {
      this._scopes.push(new Scope());
    } else {
      this._scopes.push(s);
    }
  }

  public popScope(): Scope {
    const result = this._scopes[this._scopes.length - 1];
    this._scopes.pop();
    return result;
  }

  public allocate(
    name: string,
    value: any = null,
    idType = IdentifierTypes.idVariable
  ): Identifier {
    return this._scopes[this._scopes.length - 1].allocate(name, value, idType);
  }

  // Von oben nach unten alle Scopes durchgehen und dem
  // ersten benannten Wert mit dem übergebenen Namen den
  // Wert zuweisen.
  public assign(name: string, value: any) {
    this.getVariable(name).value = value;
  }

  // dito, jedoch Wert zurückliefern (als kompletten Identifier)
  public retrieve(name: string): Identifier {
    return this.getVariable(name);
  }

  exists(
    name: string,
    inCurrentScopeOnly = false,
    idType = IdentifierTypes.idNone
  ): boolean {
    const n = inCurrentScopeOnly ? this._scopes.length - 1 : 0;
    let result = false;

    for (let i = this._scopes.length - 1; i >= n; i--) {
      const s: Scope = this._scopes[i];
      const renamed = s.getVariable(name);

      if (renamed !== undefined) {
        if (renamed.name === name) {
          if (idType === IdentifierTypes.idNone) {
            result = true;
          } else {
            if (idType === IdentifierTypes.idIsVariableOfFunction) {
              if (
                renamed.idType === IdentifierTypes.idVariable ||
                renamed.idType === IdentifierTypes.idFunction
              ) {
                result = true;
              }
            } else if (idType === IdentifierTypes.idSubOfFunction) {
              if (
                renamed.idType === IdentifierTypes.idSub ||
                renamed.idType === IdentifierTypes.idFunction
              ) {
                result = true;
              }
            } else if (idType === IdentifierTypes.idFunction) {
              if (renamed.idType === IdentifierTypes.idFunction) {
                result = true;
              }
            } else if (idType === IdentifierTypes.idSub) {
              if (renamed.idType === IdentifierTypes.idSub) {
                result = true;
              }
            } else if (idType === IdentifierTypes.idVariable) {
              if (renamed.idType === IdentifierTypes.idVariable) {
                result = true;
              }
            }
          }
        }
        return result;
      }
    }
    return false;
  }

  public push(value: any): void {
    if (value !== undefined) {
      const s: Scope = this._scopes[this._scopes.length - 1];
      s.push(value);
    }
  }

  public pop(index = -1): any {
    const i = this._scopes.length - 1;

    const s = this._scopes[i] as Scope;
    const x = s.pop(index);
    if (x !== undefined) {
      return x;
    }

    return undefined;
  }

  private getVariable(name: string): Identifier {
    let result: Identifier;
    this._scopes.map((s: Scope) => {
      const x = s.getVariable(name);
      if (x !== undefined) {
        result = x;
        return result;
      }
      return result!;
    });

    return result!;
  }
}
