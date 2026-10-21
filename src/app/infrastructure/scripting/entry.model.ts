// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Key/value pair of a script scope: a variable name bound to its value or identifier.
 * @param key - Variable name
 * @param value - Script value or identifier bound to the name
 */

import { ScriptValue } from './script-value';
import { Identifier } from './identifier';

export class Entry {
  constructor(
    public key: string,
    public value: ScriptValue | Identifier
  ) {}
}
