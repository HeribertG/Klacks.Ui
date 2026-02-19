export function cloneObject<T>(o: T): T {
  return structuredClone(o);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function compareProperty(o1: any, o2: any, property: string): boolean {
  if (Object.hasOwn(o1, property)) {
    if (!o1[property] && o2[property]) return false;
    if (o1[property] && !o2[property]) return false;
    if (o1[property] !== o2[property]) return false;
  } else if (Object.hasOwn(o2, property)) {
    return false;
  }

  if (Object.hasOwn(o2, property) && o1[property] !== o2[property]) {
    return false;
  }

  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function compareComplexObjects(o1: any, o2: any, listOfExcludedObject?: string[]): boolean {
  try {
    for (const p in o1) {
      if (p !== null) {
        if (!checkProperty(o1, o2, p, listOfExcludedObject)) return false;
      }
    }
    for (const p in o2) {
      if (p !== null) {
        if (!checkProperty(o1, o2, p, listOfExcludedObject)) return false;
      }
    }
  } catch {
    return false;
  }

  return true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function checkProperty(obj1: any, obj2: any, p: string, listExcludedObject?: string[]): boolean {
    obj1 = obj1 === null ? undefined : obj1;
    obj2 = obj2 === null ? undefined : obj2;

    if (!obj1 || !obj2) return obj1 === obj2;
    if (isPropertyExcluded(p, listExcludedObject)) return true;

    const value1 = obj1[p];
    const value2 = obj2[p];

    if (value1 === undefined || value2 === undefined) return value1 === value2;
    if (value1 === null || value2 === null) return value1 === value2;

    if (Array.isArray(value1)) {
      return Array.isArray(value2) && compareArray(value1, value2, listExcludedObject);
    }

    if (typeof value1 === 'object') {
      return typeof value2 === 'object' && compareComplexObjects(value1, value2, listExcludedObject);
    }

    return compareProperty(obj1, obj2, p);
  }

  function compareArray(arr1: unknown[], arr2: unknown[], listExcludedObject?: string[]): boolean {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
    if (arr1.length !== arr2.length) return false;

    for (let i = 0; i < arr1.length; i++) {
      const elem1 = arr1[i];
      const elem2 = arr2[i];

      if (Array.isArray(elem1)) {
        if (!Array.isArray(elem2) || !compareArray(elem1, elem2, listExcludedObject)) {
          return false;
        }
      } else if (typeof elem1 === 'object' && elem1 !== null) {
        if (isObjectExcluded(elem1, listOfExcludedObject)) continue;
        if (typeof elem2 !== 'object' || elem2 === null || !compareComplexObjects(elem1, elem2, listExcludedObject)) {
          return false;
        }
      } else if (elem1 !== elem2) {
        return false;
      }
    }

    return true;
  }

  function isObjectExcluded(o: object, excludedList?: string[]): boolean {
    if (excludedList === undefined) return false;
    return excludedList.includes(o.constructor.name);
  }

  function isPropertyExcluded(propertyName: string, excludedList?: string[]): boolean {
    if (excludedList === undefined) return false;
    return excludedList.includes(propertyName);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function copyObjectValues(o1: any, o2: any): void {
  for (const p in o1) {
    if (Object.hasOwn(o1, p) && Object.hasOwn(o2, p)) {
      o1[p] = o2[p];
    }
  }
}
