/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */
/// <summary>
/// Erzeugt ein tiefes Klon eines Objekts, indem es in JSON konvertiert und anschließend wieder geparst wird.
/// Achtung: Funktioniert nur mit JSON-kompatiblen Objekten; Funktionen, Date-Objekte, undefined oder spezielle Klassen gehen verloren.
/// </summary>
/// <param name="o">Das zu klonende Objekt.</param>
/// <returns>Ein tief geklontes Objekt.</returns>
export function cloneObject<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

export function compareProperty(o1: any, o2: any, property: string): boolean {
  // Helper function to log mismatches and return false
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function logMismatch(reason: string) {
    // console.info(`Property "${property}" does not match: ${reason}`);
    return false;
  }

  // Check if the property exists in o1
  if (o1.hasOwnProperty(property)) {
    // Check for falsy/truthy mismatches
    if (!o1[property] && o2[property]) {
      return logMismatch(
        `o1[${property}] is falsy, but o2[${property}] is truthy`
      );
    }
    if (o1[property] && !o2[property]) {
      return logMismatch(
        `o1[${property}] is truthy, but o2[${property}] is falsy`
      );
    }
    // Check for value inequality
    if (o1[property] !== o2[property]) {
      return logMismatch(
        `o1[${property}] (${o1[property]}) is not equal to o2[${property}] (${o2[property]})`
      );
    }
  } else if (o2.hasOwnProperty(property)) {
    // Property exists in o2 but not in o1
    return logMismatch(`Property exists in o2, but not in o1`);
  }

  // Additional check for inequality when property exists in o2
  // This might catch edge cases not covered by the above checks
  if (o2.hasOwnProperty(property) && o1[property] !== o2[property]) {
    return logMismatch(
      `o1[${property}] (${o1[property]}) is not equal to o2[${property}] (${o2[property]})`
    );
  }

  // If we've made it this far, the properties match
  return true;
}

export function compareObjects(o1: any, o2: any): boolean {
  // Helper function to log mismatches
  function logMismatch(prop: string, val1: any, val2: any) {
    console.info(`Objects differ at property "${prop}": ${val1} !== ${val2}`);
  }

  // Get all keys from both objects
  const allKeys = new Set([...Object.keys(o1), ...Object.keys(o2)]);

  for (const key of allKeys) {
    // Check if the property exists in both objects
    if (!(key in o1) || !(key in o2)) {
      logMismatch(key, o1[key], o2[key]);
      return false;
    }

    // If both values are objects, recursively compare them
    if (
      typeof o1[key] === 'object' &&
      o1[key] !== null &&
      typeof o2[key] === 'object' &&
      o2[key] !== null
    ) {
      if (!compareObjects(o1[key], o2[key])) {
        return false;
      }
    }
    // For non-object types, do a simple comparison
    else if (o1[key] !== o2[key]) {
      logMismatch(key, o1[key], o2[key]);
      return false;
    }
  }

  // If we've made it this far, the objects are equal
  return true;
}

export function compareComplexObjects(
  o1: any,
  o2: any,
  listOfExcludedObject?: string[]
): boolean {
  try {
    for (const p in o1) {
      if (p !== null) {
        if (!checkProperty(o1, o2, p, listOfExcludedObject)) {
          return false;
        }
      }
    }
    for (const p in o2) {
      if (p !== null) {
        if (!checkProperty(o1, o2, p, listOfExcludedObject)) {
          return false;
        }
      }
    }
  } catch (e) {
    console.error('Error compareComplexObjects', e);
    return false;
  }

  return true;

  function checkProperty(
    obj1: any,
    obj2: any,
    p: string,
    listExcludedObject?: string[]
  ): boolean {
    // Helper function to log mismatches
    function logMismatch(reason: string) {
      return false;
    }

    // Normalize null to undefined
    obj1 = obj1 === null ? undefined : obj1;
    obj2 = obj2 === null ? undefined : obj2;

    // Check if either object is undefined
    if (!obj1 || !obj2) {
      return obj1 === obj2 || logMismatch('One object is undefined');
    }

    // Check if the property should be excluded
    if (isObjectExcluded1(p, listExcludedObject)) {
      return true;
    }

    const value1 = obj1[p];
    const value2 = obj2[p];

    // Handle case where one value is undefined
    if (value1 === undefined || value2 === undefined) {
      return value1 === value2 || logMismatch('One value is undefined');
    }

    // Handle null values
    if (value1 === null || value2 === null) {
      return (
        value1 === value2 || logMismatch("Values don't match (null check)")
      );
    }

    // Compare arrays
    if (Array.isArray(value1)) {
      return (
        (Array.isArray(value2) &&
          (value1.length === 0 ||
            compareArray(value1, value2, listExcludedObject))) ||
        logMismatch('Array comparison failed')
      );
    }

    // Compare objects
    if (typeof value1 === 'object') {
      return (
        (typeof value2 === 'object' &&
          compareComplexObjects(value1, value2, listExcludedObject)) ||
        logMismatch('Object comparison failed')
      );
    }

    // Compare primitive values
    return (
      compareProperty(obj1, obj2, p) ||
      logMismatch(`Values don't match: ${value1} !== ${value2}`)
    );
  }

  /**
   * Checks if the given value is an array.
   *
   * @param value - The value to check.
   * @returns True if the value is an array, false otherwise.
   */
  function isArray(value: any): boolean {
    // Use the built-in Array.isArray method
    return Array.isArray(value);
  }

  /**
   * Compares two arrays for equality, with support for nested objects and arrays.
   *
   * @param arr1 - The first array to compare.
   * @param arr2 - The second array to compare.
   * @param listExcludedObject - Optional list of object types to exclude from comparison.
   * @returns True if the arrays are equal, false otherwise.
   */
  function compareArray(
    arr1: any[],
    arr2: any[],
    listExcludedObject?: string[]
  ): boolean {
    // Helper function to log mismatches
    function logMismatch(reason: string, index?: number) {
      console.info(
        `Array mismatch: ${reason}${
          index !== undefined ? ` at index ${index}` : ''
        }`
      );
      return false;
    }

    // Check if both inputs are actually arrays
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
      return logMismatch('One or both inputs are not arrays');
    }

    // Check for length equality
    if (arr1.length !== arr2.length) {
      return logMismatch(`Length mismatch: ${arr1.length} !== ${arr2.length}`);
    }

    // Compare array elements
    for (let i = 0; i < arr1.length; i++) {
      const elem1 = arr1[i];
      const elem2 = arr2[i];

      if (Array.isArray(elem1)) {
        if (
          !Array.isArray(elem2) ||
          !compareArray(elem1, elem2, listExcludedObject)
        ) {
          return logMismatch('Nested array mismatch', i);
        }
      } else if (typeof elem1 === 'object' && elem1 !== null) {
        if (isObjectExcluded(elem1, listExcludedObject)) {
          continue;
        }
        if (
          typeof elem2 !== 'object' ||
          elem2 === null ||
          !compareComplexObjects(elem1, elem2, listExcludedObject)
        ) {
          return logMismatch('Nested object mismatch', i);
        }
      } else if (elem1 !== elem2) {
        return logMismatch(`Element mismatch: ${elem1} !== ${elem2}`, i);
      }
    }

    return true;
  }

  function isObjectExcluded(o: any, listOfExcludedObject?: string[]): boolean {
    if (listOfExcludedObject !== undefined) {
      const objectName = o.constructor.name;

      if (
        listOfExcludedObject.findIndex((element) => element === objectName) > -1
      ) {
        return true;
      }
    }
    return false;
  }
  function isObjectExcluded1(
    objectName: string,

    listOfExcludedObject?: string[]
  ): boolean {
    if (listOfExcludedObject !== undefined) {
      if (
        listOfExcludedObject.findIndex((element) => element === objectName) > -1
      ) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Checks if a value can be interpreted as a number.
 *
 * @param val - The value to check.
 * @returns True if the value can be interpreted as a number, false otherwise.
 */
export function isNumberLike(val: any): boolean {
  // Check if the value is already a number
  if (typeof val === 'number') {
    return !isNaN(val) && isFinite(val);
  }

  // If it's not a string, it can't be converted to a number
  if (typeof val !== 'string') {
    return false;
  }

  // Trim the string and check if it's empty
  const trimmed = val.trim();
  if (trimmed.length === 0) {
    return false;
  }

  // Try to convert to a number and check the result
  const num = Number(trimmed);
  return !isNaN(num) && isFinite(num);
}

/**
 * Validates if the pressed key is a single letter (A-Z or a-z).
 *
 * @param event - The KeyboardEvent to validate.
 * @returns True if the key is a single letter, false otherwise.
 */
export function lettersOnly(event: KeyboardEvent): boolean {
  // Check if the key is 'Process' (for IME composition)
  if (event.key === 'Process') {
    return true;
  }

  // Test if the key is a single letter
  return /^[A-Za-z]$/.test(event.key);
}

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

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

export function copyObjectValues(o1: any, o2: any) {
  for (const p in o1) {
    if (o1.hasOwnProperty(p)) {
      if (o2.hasOwnProperty(p)) {
        o1[p] = o2[p];
      }
    }
  }
}

export function createStringId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  ).toUpperCase();
}

/**
 * Creates a sorting function for multiple fields with support for ascending and descending order.
 *
 * @param fields - An array of field names to sort by. Prefix a field with '-' for descending order.
 * @returns A comparison function to be used with Array.sort().
 */
export function sortMultiFields(fields: string[]): (a: any, b: any) => number {
  return (a: any, b: any): number => {
    for (const field of fields) {
      let isDescending = false;
      let fieldName = field;

      // Check if the field should be sorted in descending order
      if (field.startsWith('-')) {
        isDescending = true;
        fieldName = field.slice(1);
      }

      const valueA = a[fieldName];
      const valueB = b[fieldName];

      // Handle cases where the property doesn't exist
      if (valueA === undefined && valueB === undefined) continue;
      if (valueA === undefined) return 1;
      if (valueB === undefined) return -1;

      let comparison = 0;

      // Compare values based on their type
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        comparison = valueA.localeCompare(valueB);
      } else {
        const numA = Number(valueA);
        const numB = Number(valueB);
        if (!isNaN(numA) && !isNaN(numB)) {
          comparison = numA - numB;
        } else {
          comparison = String(valueA).localeCompare(String(valueB));
        }
      }

      // Adjust comparison for descending order
      if (isDescending) comparison = -comparison;

      if (comparison !== 0) return comparison;
    }

    return 0;
  };
}
