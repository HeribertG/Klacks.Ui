// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Enum for macro category classification used to link macros to specific absence/shift types.
 * Values 1-6 are exclusive — only one macro per category is allowed at a time.
 */
export enum MacroCategoryEnum {
  Unspecified = 0,
  Shift = 1,
  Vacation = 2,
  Illness = 3,
  Accident = 4,
  WorkshopPaid = 5,
  WorkshopUnpaid = 6,
}

export const MacroCategoryLabels: Record<MacroCategoryEnum, string> = {
  [MacroCategoryEnum.Unspecified]: 'setting.macro.category.unspecified',
  [MacroCategoryEnum.Shift]: 'setting.macro.category.shift',
  [MacroCategoryEnum.Vacation]: 'setting.macro.category.vacation',
  [MacroCategoryEnum.Illness]: 'setting.macro.category.illness',
  [MacroCategoryEnum.Accident]: 'setting.macro.category.accident',
  [MacroCategoryEnum.WorkshopPaid]: 'setting.macro.category.workshop-paid',
  [MacroCategoryEnum.WorkshopUnpaid]: 'setting.macro.category.workshop-unpaid',
};
