// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Type guards for narrowing nullable values without relying on truthy/falsy
 * checks. Prevents accidental false negatives for values whose falsy
 * representation is a legitimate value (e.g. number 0, empty string).
 * @param value - Any value that may also be null or undefined
 */

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Reads a value of unknown type as a non-empty string.
 * @param value - Untyped input such as a parsed JSON field or a model-supplied function argument
 * @returns The value when it is a non-empty string, otherwise undefined
 */
export function toNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
