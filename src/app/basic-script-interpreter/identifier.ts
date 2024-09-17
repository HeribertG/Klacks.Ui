export class Identifier {
  static IdentifierTypes: any;

  public name: string = '';
  public value: any;
  public idType: IdentifierTypes = IdentifierTypes.idNone;
  public address: number = -1;
  public formalParameters: any[] = [];
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
