// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads a value of unknown type as a non-empty string.
 * @param value - Untyped input such as a parsed JSON field or a model-supplied function argument
 * @returns The value when it is a non-empty string, otherwise undefined
 */
export function toNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
