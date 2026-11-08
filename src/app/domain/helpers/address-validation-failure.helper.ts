// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads a geocoding refusal of the server: a validation message "address.validation.failed|<address>" in the
 * problem's `errors`. Shared by the HTTP interceptor, the client form and the stand-in conversion.
 * @param error - The failed response (HttpErrorResponse) or its plain-object form
 * @returns The first refused address text, '' when the refusal names none, null when the error is no geocoding refusal
 */

export const ADDRESS_VALIDATION_FAILED_KEY = 'address.validation.failed';

const ADDRESS_SEPARATOR = '|';

export function readAddressValidationFailure(error: unknown): string | null {
  const errors = (error as { error?: { errors?: Record<string, unknown> } } | null)?.error?.errors;
  if (!errors) {
    return null;
  }

  const refusals = Object.values(errors)
    .flat()
    .filter((message): message is string => typeof message === 'string' && message.startsWith(ADDRESS_VALIDATION_FAILED_KEY));
  if (refusals.length === 0) {
    return null;
  }

  return refusals.map((message) => message.split(ADDRESS_SEPARATOR)[1] || '').find(Boolean) ?? '';
}
