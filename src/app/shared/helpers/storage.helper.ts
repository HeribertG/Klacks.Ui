// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Storage Helper
 *
 * Pure functions for localStorage operations.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Checks if localStorage is available.
 *
 * @returns true if available, false otherwise
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves a filter to localStorage.
 *
 * @param value - Value to save (will be JSON stringified)
 * @param token - Storage key
 * @returns true if saved successfully, false otherwise
 */
export function saveFilter(value: any, token: string): boolean {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available. Filter could not be saved.');
    return false;
  }

  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(token, serializedValue);
    return true;
  } catch (error) {
    console.error('Error when saving the filter:', error);
    return false;
  }
}

/**
 * Restores a filter from localStorage.
 *
 * @param token - Storage key
 * @returns Parsed value or null if not found/error
 */
export function restoreFilter(token: string): any | null {
  if (!isLocalStorageAvailable()) {
    console.warn(
      'localStorage is not available. Filter could not be restored.'
    );
    return null;
  }

  try {
    const serializedValue = localStorage.getItem(token);
    if (serializedValue === null) {
      return null;
    }
    return JSON.parse(serializedValue);
  } catch (error) {
    console.error('Error when restoring the filter:', error);
    return null;
  }
}
