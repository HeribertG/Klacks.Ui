// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Phone Number Helper
 *
 * Pure functions for phone number formatting.
 */

/**
 * Removes all non-digit characters from a phone number.
 *
 * @param value - Phone number string
 * @returns Unformatted phone number (digits only)
 */
export function unformatPhoneNumber(value: string): string {
  if (!value) {
    return '';
  }
  const tmpValue = value.replace(/\D/g, '');

  return tmpValue;
}

/**
 * Formats a phone number with spaces for better readability.
 *
 * @param value - Phone number string
 * @returns Formatted phone number
 */
export function formatPhoneNumber(value: string): string {
  let hasCross = false;
  if (value) {
    if (value.substring(0, 1) === '+') {
      hasCross = true;
    }

    value = unformatPhoneNumber(value);
    const tmpValue = unformatPhoneNumber(value);
    if (!hasCross) {
      return formatPhoneNumberWithoutCross(tmpValue);
    }
    if (hasCross) {
      return '+' + formatPhoneNumberWithCross(tmpValue);
    }
  }

  return '';
}

function formatPhoneNumberWithoutCross(value: string): string {
  if (value.length === 0) {
    value = '';
  } else if (value.length <= 2) {
    value = value.replace(/^(\d{0,2})/, '$1');
  } else if (value.length <= 5) {
    value = value.replace(/^(\d{0,3})(\d{0,2})/, '$1 $2');
  } else if (value.length === 6) {
    value = value.replace(/^(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,1})/, '$1 $2 $3');
  } else if (value.length === 7) {
    value = value.replace(/^(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})/, '$1 $2 $3');
  } else if (value.length <= 9) {
    value = value.replace(
      /^(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4'
    );
  } else if (value.length === 10) {
    value = value.replace(
      /^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,1})/,
      '$1 $2 $3 $4 $5'
    );
  } else if (value.length <= 11) {
    value = value.replace(
      /^(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4 $5'
    );
  } else if (value.length === 12) {
    value = value.replace(
      /^(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,1})/,
      '$1 $2 $3 $4 $5 $6'
    );
  } else if (value.length <= 13) {
    value = value.replace(
      /^(\d{0,4})(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4 $5 $6'
    );
  } else {
    value = value.replace(
      /^(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4 $5 $6'
    );
  }
  return value;
}

function formatPhoneNumberWithCross(value: string): string {
  if (value.length === 0) {
    value = '';
  } else if (value.length <= 2) {
    value = value.replace(/^(\d{0,2})/, '$1');
  } else if (value.length <= 5) {
    value = value.replace(/^(\d{0,2})(\d{0,2})(\d{0,1})/, '$1 $2 $3');
  } else if (value.length === 6) {
    value = value.replace(/^(\d{0,2})(\d{0,2})(\d{0,3})(\d{0,1})/, '$1 $2 $3');
  } else if (value.length === 7) {
    value = value.replace(/^(\d{0,2})(\d{0,2})(\d{0,3})(\d{0,2})/, '$1 $2 $3');
  } else if (value.length <= 9) {
    value = value.replace(
      /^(\d{0,2})(\d{0,2})(\d{0,3})(\d{0,2})/,
      '$1 $2 $3 $4'
    );
  } else if (value.length === 10) {
    value = value.replace(
      /^(\d{0,2})(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4 $5'
    );
  } else if (value.length <= 11) {
    value = value.replace(
      /^(\d{0,2})(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4 $5'
    );
  } else if (value.length === 12) {
    value = value.replace(
      /^(\d{0,2})(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,1})/,
      '$1 $2 $3 $4 $5 $6'
    );
  } else if (value.length <= 13) {
    value = value.replace(
      /^(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4 $5 $6'
    );
  } else {
    value = value.replace(
      /^(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4 $5 $6'
    );
  }
  return value;
}
