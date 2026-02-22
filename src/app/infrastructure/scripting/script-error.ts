// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface ScriptError {
  readonly code: number;
  readonly description: string;
  readonly line: number;
  readonly column: number;
}

export function createScriptError(
  code: number,
  description: string,
  line: number,
  column: number
): ScriptError {
  return { code, description, line, column };
}
