/**
 * Object Helper
 *
 * Pure functions for object manipulation and comparison.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Creates a deep clone of an object using JSON serialization.
 * Note: Only works with JSON-compatible objects; functions, Date objects, undefined or special classes will be lost.
 *
 * @param o - Object to clone
 * @returns Deep cloned object
 */
export function cloneObject<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

/**
 * Compares a specific property between two objects.
 *
 * @param o1 - First object
 * @param o2 - Second object
 * @param property - Property name to compare
 * @returns true if property values match, false otherwise
 */
export function compareProperty(o1: any, o2: any, property: string): boolean {
  function logMismatch(reason: string) {
    return false;
  }

  if (o1.hasOwnProperty(property)) {
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
    if (o1[property] !== o2[property]) {
      return logMismatch(
        `o1[${property}] (${o1[property]}) is not equal to o2[${property}] (${o2[property]})`
      );
    }
  } else if (o2.hasOwnProperty(property)) {
    return logMismatch(`Property exists in o2, but not in o1`);
  }

  if (o2.hasOwnProperty(property) && o1[property] !== o2[property]) {
    return logMismatch(
      `o1[${property}] (${o1[property]}) is not equal to o2[${property}] (${o2[property]})`
    );
  }

  return true;
}

/**
 * Compares two objects for deep equality.
 *
 * @param o1 - First object
 * @param o2 - Second object
 * @returns true if objects are equal, false otherwise
 */
export function compareObjects(o1: any, o2: any): boolean {
  function logMismatch(prop: string, val1: any, val2: any) {
    console.info(`Objects differ at property "${prop}": ${val1} !== ${val2}`);
  }

  const allKeys = new Set([...Object.keys(o1), ...Object.keys(o2)]);

  for (const key of allKeys) {
    if (!(key in o1) || !(key in o2)) {
      logMismatch(key, o1[key], o2[key]);
      return false;
    }

    if (
      typeof o1[key] === 'object' &&
      o1[key] !== null &&
      typeof o2[key] === 'object' &&
      o2[key] !== null
    ) {
      if (!compareObjects(o1[key], o2[key])) {
        return false;
      }
    } else if (o1[key] !== o2[key]) {
      logMismatch(key, o1[key], o2[key]);
      return false;
    }
  }

  return true;
}

/**
 * Compares two complex objects with support for excluding specific properties.
 *
 * @param o1 - First object
 * @param o2 - Second object
 * @param listOfExcludedObject - Optional list of property names to exclude from comparison
 * @returns true if objects are equal (excluding specified properties), false otherwise
 */
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
    function logMismatch(reason: string) {
      return false;
    }

    obj1 = obj1 === null ? undefined : obj1;
    obj2 = obj2 === null ? undefined : obj2;

    if (!obj1 || !obj2) {
      return obj1 === obj2 || logMismatch('One object is undefined');
    }

    if (isObjectExcluded1(p, listExcludedObject)) {
      return true;
    }

    const value1 = obj1[p];
    const value2 = obj2[p];

    if (value1 === undefined || value2 === undefined) {
      return value1 === value2 || logMismatch('One value is undefined');
    }

    if (value1 === null || value2 === null) {
      return (
        value1 === value2 || logMismatch("Values don't match (null check)")
      );
    }

    if (Array.isArray(value1)) {
      return (
        (Array.isArray(value2) &&
          compareArray(value1, value2, listExcludedObject)) ||
        logMismatch('Array comparison failed')
      );
    }

    if (typeof value1 === 'object') {
      return (
        (typeof value2 === 'object' &&
          compareComplexObjects(value1, value2, listExcludedObject)) ||
        logMismatch('Object comparison failed')
      );
    }

    return (
      compareProperty(obj1, obj2, p) ||
      logMismatch(`Values don't match: ${value1} !== ${value2}`)
    );
  }

  function isArray(value: any): boolean {
    return Array.isArray(value);
  }

  function compareArray(
    arr1: any[],
    arr2: any[],
    listExcludedObject?: string[]
  ): boolean {
    function logMismatch(_reason: string, _index?: number) {
      return false;
    }

    if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
      return logMismatch('One or both inputs are not arrays');
    }

    if (arr1.length !== arr2.length) {
      return logMismatch(`Length mismatch: ${arr1.length} !== ${arr2.length}`);
    }

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
 * @param val - Value to check
 * @returns true if value is number-like, false otherwise
 */
export function isNumberLike(val: any): boolean {
  if (typeof val === 'number') {
    return !isNaN(val) && isFinite(val);
  }

  if (typeof val !== 'string') {
    return false;
  }

  const trimmed = val.trim();
  if (trimmed.length === 0) {
    return false;
  }

  const num = Number(trimmed);
  return !isNaN(num) && isFinite(num);
}

/**
 * Validates if the pressed key is a single letter (A-Z or a-z).
 *
 * @param event - KeyboardEvent to validate
 * @returns true if key is a letter, false otherwise
 */
export function lettersOnly(event: KeyboardEvent): boolean {
  if (event.key === 'Process') {
    return true;
  }

  return /^[A-Za-z]$/.test(event.key);
}

/**
 * Copies all matching property values from o2 to o1.
 *
 * @param o1 - Target object
 * @param o2 - Source object
 */
export function copyObjectValues(o1: any, o2: any) {
  for (const p in o1) {
    if (o1.hasOwnProperty(p)) {
      if (o2.hasOwnProperty(p)) {
        o1[p] = o2[p];
      }
    }
  }
}

/**
 * Creates a sorting function for multiple fields with support for ascending and descending order.
 *
 * @param fields - Array of field names to sort by. Prefix a field with '-' for descending order.
 * @returns Comparison function to be used with Array.sort()
 *
 * @example
 * const sortFn = sortMultiFields(['name', '-age']);
 * array.sort(sortFn);
 */
export function sortMultiFields(fields: string[]): (a: any, b: any) => number {
  return (a: any, b: any): number => {
    for (const field of fields) {
      let isDescending = false;
      let fieldName = field;

      if (field.startsWith('-')) {
        isDescending = true;
        fieldName = field.slice(1);
      }

      const valueA = a[fieldName];
      const valueB = b[fieldName];

      if (valueA === undefined && valueB === undefined) continue;
      if (valueA === undefined) return 1;
      if (valueB === undefined) return -1;

      let comparison = 0;

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

      if (isDescending) comparison = -comparison;

      if (comparison !== 0) return comparison;
    }

    return 0;
  };
}
