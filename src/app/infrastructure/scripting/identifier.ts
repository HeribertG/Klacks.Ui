// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IdentifierTypes } from './identifier-types.enum';
import { ScriptValue } from './script-value';

export class Identifier {
  public name = '';
  public value: ScriptValue = ScriptValue.Null;
  public idType: IdentifierTypes = IdentifierTypes.idNone;
  public address = -1;
  public formalParameters: string[] = [];
}
