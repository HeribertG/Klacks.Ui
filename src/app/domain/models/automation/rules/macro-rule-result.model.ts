// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IMacroRuleResult {
  macroId: string;
  macroName: string;
  passed: boolean;
  severity: number;
  message: string;
}
