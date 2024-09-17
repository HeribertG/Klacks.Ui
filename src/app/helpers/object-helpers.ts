import { IFilter } from '../core/client-class';

export function cloneObject(o: any): any {
  return JSON.parse(JSON.stringify(o));
}

export function compareProperty(o1: any, o2: any, property: string): boolean {
  if (o1.hasOwnProperty(property)) {
    if (!o1[property] && o2[property]) {
      return false;
    }
    if (o1[property] && !o2[property]) {
      return false;
    }
    if (o1[property] !== o2[property]) {
      return false;
    }
  }
  if (o2.hasOwnProperty(property)) {
    if (o1[property] !== o2[property]) {
      return false;
    }
  }
  return true;
}

export function compareObjects(o1: any, o2: any): boolean {
  for (const p in o1) {
    if (o1.hasOwnProperty(p)) {
      if (o1[p] !== o2[p]) {
        return false;
      }
    }
  }
  for (const p in o2) {
    if (o2.hasOwnProperty(p)) {
      if (o1[p] !== o2[p]) {
        return false;
      }
    }
  }
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
    if (obj1 === null) {
      obj1 = undefined;
    }
    if (obj2 === null) {
      obj2 = undefined;
    }

    if (obj1 && obj2) {
      if (
        (obj1 !== undefined && obj2 === undefined) ||
        (obj1 === undefined && obj2 !== undefined)
      ) {
        return false;
      } else {
        if (!isObjectExcluded1(p, listExcludedObject)) {
          if (obj1[p] !== null) {
            if (isArray(obj1[p])) {
              if (obj1[p].length > 0) {
                if (!compareArray(obj1[p], obj2[p], listExcludedObject)) {
                  return false;
                }
              }

              return true;
            } else if (typeof obj1[p] === 'object') {
              if (
                !compareComplexObjects(obj1[p], obj2[p], listExcludedObject)
              ) {
                return false;
              }
            } else {
              if (!compareProperty(obj1, obj2, p)) {
                return false;
              }
            }
          }
        }
      }
    } else {
      return false;
    }

    return true;
  }

  function isArray(value: any): boolean {
    if (value === null) {
      return false;
    }
    if (value === '') {
      return false;
    }
    if (Array.isArray(value)) {
      return true;
    }
    return false;
  }

  function compareArray(
    obj1: any,
    obj2: any,
    listExcludedObject?: string[]
  ): boolean {
    if ((obj1 && !obj2) || (!obj1 && obj2)) {
      return false;
    }

    if (!obj1 && !obj2) {
      return true;
    }

    if (obj1.length !== obj2.length) {
      return false;
    }

    for (let i = 0; i < obj1.length; i++) {
      if (typeof obj1[i] === 'object') {
        if (!isObjectExcluded(obj1[i], listExcludedObject)) {
          if (!compareComplexObjects(obj1[i], obj2[i], listExcludedObject)) {
            return false;
          }
        }
      } else if (isArray(obj1[i])) {
        if (obj1[i].length > 0) {
          if (!compareArray(obj1[i], obj2[i])) {
            return false;
          }
        }
      } else {
        if (obj1[i] !== obj2[i]) {
          return false;
        }
      }
    }

    return true;
  }

  // tslint:disable-next-line: no-shadowed-variable
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
    // tslint:disable-next-line: no-shadowed-variable
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

export function isNumberLike(val: any): boolean {
  return !(val instanceof Array) && val - parseFloat(val) + 1 >= 0;
}

export function lettersOnly(event: KeyboardEvent): boolean {
  const char = event.key;
  return /^[A-Za-z]$/.test(char);
}

export function saveFilter(value: any, token: string) {
  localStorage.removeItem(token);
  const tmp = JSON.stringify(value);
  localStorage.setItem(token, tmp);
}

export function restoreFilter(token: string): any | undefined {
  if (
    localStorage.getItem(token) === undefined ||
    localStorage.getItem(token) === undefined
  ) {
    return undefined;
  }
  return JSON.parse(localStorage.getItem(token)!);
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

export function sortMultiFields(prop: any) {
  return function (a: any, b: any) {
    for (let i = 0; i < prop.length; i++) {
      const reg = /^\d+$/;
      let x = 1;
      let field1 = prop[i];
      if (prop[i].indexOf('-') === 0) {
        field1 = prop[i].substr(1, prop[i].length);
        x = -x;
      }

      if (reg.test(a[field1])) {
        a[field1] = parseFloat(a[field1]);
        b[field1] = parseFloat(b[field1]);
      }
      if (a[field1] > b[field1]) {
        return x;
      } else if (a[field1] < b[field1]) {
        return -x;
      }
    }
    return 0;
  };
}
