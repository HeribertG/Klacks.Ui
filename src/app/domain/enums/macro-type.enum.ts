// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export enum MacroTypes {
  ShiftAndEmployments = 0,
  WorkRules = 1,
}

export const MacroTypeLabels: Record<MacroTypes, string> = {
  [MacroTypes.ShiftAndEmployments]: 'setting.macro.type.shift-and-employments',
  [MacroTypes.WorkRules]: 'setting.macro.type.work-rules',
};
