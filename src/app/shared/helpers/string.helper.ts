// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * String Helper
 *
 * Pure functions for string manipulation and validation.
 */

/**
 * Replaces umlaut and special characters with ASCII equivalents.
 *
 * @param value - String to process
 * @returns String with umlauts replaced
 */
export function replaceUmlaud(value: string): string {
  value = value.toLowerCase();
  return value
    .replace(/[áàâäāăąåæã]/g, 'a')
    .replace(/[úùûüůūŭųů]/g, 'u')
    .replace(/[éèëêȩ]/g, 'e')
    .replace(/[òóôõöōŏœ]/g, 'o')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[çćĉċčċ]/g, 'c')
    .replace(/[śŝşš]/g, 's')
    .replace(/[ŕŗř]/g, 'r')
    .replace(/[źżž]/g, 'z');
}

/**
 * Validates email address format.
 *
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  const re = /^[^\s@.][^\s@]*@[^\s@.]+(\.[^\s@.]+)+$/;
  return re.test(email);
}

/**
 * Creates a smart abbreviation from text.
 *
 * @param text - Text to abbreviate
 * @param maxLength - Maximum length of abbreviation (default: 5)
 * @returns Abbreviated string in uppercase
 *
 * @example
 * createSmartAbbreviation("Hello World") // "HW"
 * createSmartAbbreviation("Test", 5) // "TST"
 */
export function createSmartAbbreviation(text: string, maxLength = 5): string {
  const words = text.split(' ');

  if (words.length === 1) {
    return words[0]
      .replace(/[aeiou]/gi, '')
      .substring(0, maxLength)
      .toUpperCase();
  } else {
    let result = words.map((word) => word.charAt(0)).join('');

    if (result.length < maxLength) {
      for (const word of words) {
        if (result.length >= maxLength) break;
        if (word.length > 1) {
          result += word.charAt(1);
        }
      }
    }

    return result.substring(0, maxLength).toUpperCase();
  }
}

/**
 * Validates if an ID is valid (not null/undefined/empty).
 *
 * @param id - ID to validate
 * @returns true if valid, false otherwise
 */
export function isIdValid(id: string | undefined): boolean {
  if (id) {
    return true;
  }
  return false;
}

/**
 * Gets the file extension from a filename.
 *
 * @param fileName - Filename to extract extension from
 * @returns File extension (without dot)
 */
export function getFileExtension(fileName: string): string {
  return fileName.slice(
    (Math.max(0, fileName.lastIndexOf('.')) || Infinity) + 1
  );
}

/**
 * Pads a string with zeros to reach specified length.
 *
 * @param str - String to pad
 * @param len - Target length (default: 2)
 * @returns Zero-padded string
 *
 * @example
 * padZero("5", 2) // "05"
 * padZero("123", 5) // "00123"
 */
export function padZero(str: string, len: number | null) {
  len = len || 2;
  const zeros = new Array(len).join('0');
  return (zeros + str).slice(-len);
}
