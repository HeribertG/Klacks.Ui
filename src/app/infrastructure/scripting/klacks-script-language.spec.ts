// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { describe, it, expect } from 'vitest';
import {
  MACRO_AUTO_IMPORTS,
  MACRO_EXTERNAL_VARIABLES,
  MACRO_IMPORT_PREFIX,
} from 'src/app/domain/constants/macro-external-variables.constants';
import { externalVariables } from './klacks-script-language';
import { ShiftData } from 'src/app/domain/models/shift/shift-data-class';
import { ScriptService } from './script.service';

/**
 * Mirror of the script-importable variables bound by the backend in
 * Klacks.Api MacroCompilationService.SetImportsFromMacroData (source of truth:
 * Klacks.Api/Domain/Models/Macros/MacroData.cs). When the backend gains a new
 * importable variable, extend this list and the failing assertions below point
 * to every frontend spot that must learn the variable as well.
 */
const BACKEND_MACRO_DATA_VARIABLES = [
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
];

const NEW_SHIFT_DATA_PROPERTIES = ['Percent', 'WeekendDay1', 'WeekendDay2', 'WeekendDay3'];

describe('macro external variable coverage', () => {
  it('mirrors every script-importable MacroData variable in MACRO_EXTERNAL_VARIABLES', () => {
    expect([...MACRO_EXTERNAL_VARIABLES].sort()).toEqual([...BACKEND_MACRO_DATA_VARIABLES].sort());
  });

  it('exposes every external variable as a ShiftData test value', () => {
    const shiftDataKeys = Object.keys(new ShiftData())
      .map((key) => key.toLowerCase())
      .sort();
    expect(shiftDataKeys).toEqual([...MACRO_EXTERNAL_VARIABLES].sort());
  });

  it('highlights every external variable in the script language', () => {
    expect([...externalVariables].sort()).toEqual([...MACRO_EXTERNAL_VARIABLES].sort());
  });

  it('auto-imports every external variable in the macro editor', () => {
    expect([...MACRO_AUTO_IMPORTS]).toEqual(
      MACRO_EXTERNAL_VARIABLES.map((name) => `${MACRO_IMPORT_PREFIX}${name}`)
    );
  });

  it('provides property-grid metadata for the new external variables', () => {
    for (const key of NEW_SHIFT_DATA_PROPERTIES) {
      expect(ShiftData.metadata[key], `metadata for ${key}`).toBeDefined();
    }
  });
});

describe('macro editor test run with ShiftData values', () => {
  it('delivers percent and weekend day test values into a script', () => {
    const service = new ScriptService();
    const externals: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(new ShiftData())) {
      externals[key.toLowerCase()] = value;
    }

    const source = `${MACRO_AUTO_IMPORTS.join('\n')}\n\noutput 1, percent\noutput 1, weekendday1`;
    const result = service.run(source, false, true, externals);

    expect(result.success).toBe(true);
    expect(result.messages.map((m) => m.message)).toEqual(['100', '6']);
  });
});
