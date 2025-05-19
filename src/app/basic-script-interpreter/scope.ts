import { Identifier, IdentifierTypes } from './identifier';

export class Entry {
  constructor(public key: string, public value: any) {}
}

export class Scope {
  private _variables: Entry[] = [];

  allocate(
    name: string,
    value = null,
    idType: IdentifierTypes = IdentifierTypes.idVariable
  ): Identifier {
    const id: Identifier = new Identifier();

    id.name = name;
    id.value = value;
    id.idType = idType;
    this.setVariable(id, name);
    return id;
  }

  assign(name: string, value: Identifier): void {
    this.getVariable(name)!.value = value;
  }

  retrieve(name: string): Identifier {
    const result = this._variables.find((x) => x.key === name);
    return result!.value;
  }

  exists(name: string): boolean {
    const result = this._variables.find((x) => x.key === name);
    return result !== undefined;
  }

  getVariable(name: string): Identifier | undefined {
    if (this._variables.length === 0) {
      return undefined;
    }

    const result = this._variables.find((x) => x.key === name);
    if (result !== undefined) {
      return result.value;
    } else {
      return undefined;
    }
  }

  setVariable(value: Identifier, name: string): void {
    // Benannten Wert löschen , damit es ersetzt wird
    if (this._variables.length > 0) {
      const result = this._variables.find((x) => x.key === name);
      if (result !== undefined) {
        const index = this._variables.indexOf(result);
        this._variables.splice(index, 1);
      }
    }

    // Variablen immer am Anfang des Scopes zusammenhalten. Nach der letzten
    // Variablen kommen nur noch echte Stackwerte
    const c = new Entry(name, value);
    if (this._variables.length === 0) {
      this._variables.push(c);
    } else {
      this._variables.unshift(c);
    }
  }

  push(value: any): void {
    const c = new Entry('', value);
    this._variables.push(c);
  }

  pop(index = -1): any {
    let result;

    if (index < 0) {
      result = this._variables.pop();
    } else {
      const length = this._variables.length - 1;
      result = this._variables[length - index];
    }
    return result;
  }

  cloneCount(): number {
    return this._variables.length;
  }

  cloneItem(index: number): Identifier {
    return this._variables[index].value;
  }
}
