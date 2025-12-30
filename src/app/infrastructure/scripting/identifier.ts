import { ScriptValue } from './script-value';

export class Identifier {
  public name = '';
  public value: ScriptValue = ScriptValue.Null;
  public idType: IdentifierTypes = IdentifierTypes.idNone;
  public address = -1;
  public formalParameters: Identifier[] = [];
}

export enum IdentifierTypes {
  idIsVariableOfFunction = -2,
  idSubOfFunction = -1,
  idNone = 0,
  idConst = 1,
  idVariable = 2,
  idFunction = 4,
  idSub = 8,
}
