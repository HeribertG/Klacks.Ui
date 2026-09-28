// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export enum MacroFunction {
  Custom = 0,
  Standard = 1,
  StandardAdditive = 2,
}

export const MacroFunctionLabels: Record<MacroFunction, string> = {
  [MacroFunction.Custom]: 'setting.macro.function.custom',
  [MacroFunction.Standard]: 'setting.macro.function.standard',
  [MacroFunction.StandardAdditive]: 'setting.macro.function.standard-additive',
};
