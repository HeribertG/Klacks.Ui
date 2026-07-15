// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export enum MacroFunction {
  Custom = 0,
  Standard = 1,
  StandardAdditive = 2,
}

export const MacroFunctionLabels: Partial<Record<MacroFunction, string>> = {
  [MacroFunction.Custom]: 'setting.macro.function.custom',
  [MacroFunction.Standard]: 'setting.macro.function.standard',
};
