// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IMacroRuleResult {
  macroId: string;
  macroName: string;
  passed: boolean;
  severity: number;
  message: string;
}
