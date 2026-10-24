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
