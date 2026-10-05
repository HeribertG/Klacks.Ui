// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach } from 'vitest';
import { ScriptService } from './script.service';

const WEEKDAY_VALUE = 3;

describe('Identifier case-insensitivity (mirrors backend Scope/Scopes/CompiledScript OrdinalIgnoreCase)', () => {
  let service: ScriptService;

  beforeEach(() => {
    service = new ScriptService();
  });

  it('resolves an import declared in lowercase when the script uses PascalCase', () => {
    const result = service.run('import weekday\noutput 1, Weekday', false, true, { weekday: WEEKDAY_VALUE });

    expect(result.success, result.error?.description).toBe(true);
    expect(result.messages[0].message).toBe(String(WEEKDAY_VALUE));
  });

  it('binds an external value whose name differs in case from the import', () => {
    const result = service.run('import Weekday\noutput 1, weekday', false, true, { WEEKDAY: WEEKDAY_VALUE });

    expect(result.success, result.error?.description).toBe(true);
    expect(result.messages[0].message).toBe(String(WEEKDAY_VALUE));
  });

  it('treats a declared variable as the same identifier regardless of case', () => {
    const result = service.run('DIM Abc\nabc = 5\noutput 1, ABC', true, true);

    expect(result.success, result.error?.description).toBe(true);
    expect(result.messages[0].message).toBe('5');
  });

  it('calls a user function regardless of case', () => {
    const source = 'FUNCTION Twice(x)\n  Twice = x * 2\nENDFUNCTION\noutput 1, twice(4)';

    const result = service.run(source, false, true);

    expect(result.success, result.error?.description).toBe(true);
    expect(result.messages[0].message).toBe('8');
  });

  it('rejects a second import of the same name in a different case, like the backend', () => {
    const compiled = service.compile('import weekday\nIMPORT Weekday', false, true);

    expect(compiled.hasError).toBe(true);
  });
});
