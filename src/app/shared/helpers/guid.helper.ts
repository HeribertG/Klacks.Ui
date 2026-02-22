// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * GUID Helper
 *
 * Pure functions for GUID/UUID generation.
 */

/**
 * Generates a new GUID/UUID v4.
 *
 * @returns GUID string in format "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
 */
export function newGuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates a short unique string ID based on timestamp and random value.
 *
 * @returns Uppercase string ID
 *
 * @example
 * createStringId() // "L8Z3K9A2B"
 */
export function createStringId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  ).toUpperCase();
}
