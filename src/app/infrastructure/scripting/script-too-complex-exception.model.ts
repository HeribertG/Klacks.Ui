// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Error raised when a script exceeds the execution limits of the interpreter.
 * @param message - Description of the exceeded limit
 */

export class ScriptTooComplexException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScriptTooComplexException';
  }
}
