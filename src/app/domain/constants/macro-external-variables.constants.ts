// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Canonical list of all external (importable) macro script variables.
 * Mirrors the backend binding in Klacks.Api MacroCompilationService.SetImportsFromMacroData,
 * whose source of truth is Klacks.Api/Domain/Models/Macros/MacroData.cs. Every entry is the
 * exact lowercase identifier a macro script uses in an "import" statement.
 */
export const MACRO_EXTERNAL_VARIABLES = [
  'hour',
  'fromhour',
  'untilhour',
  'weekday',
  'holiday',
  'holidaynextday',
  'nightrate',
  'holidayrate',
  'we1rate',
  'we2rate',
  'we3rate',
  'nightstart',
  'nightend',
  'guaranteedhours',
  'fulltime',
  'percent',
  'weekendday1',
  'weekendday2',
  'weekendday3',
] as const;

export type MacroExternalVariable = (typeof MACRO_EXTERNAL_VARIABLES)[number];

export const MACRO_IMPORT_PREFIX = 'import ';

export const MACRO_AUTO_IMPORTS: readonly string[] = MACRO_EXTERNAL_VARIABLES.map(
  (name) => `${MACRO_IMPORT_PREFIX}${name}`
);
