import {
  cloneObject,
  compareComplexObjects,
  compareObjects,
  compareProperty,
  copyObjectValues,
  isNumberLike,
  lettersOnly,
} from './object-helpers';

describe('Utility Functions', () => {
  describe('cloneObject', () => {
    it('should clone an object deeply', () => {
      const obj = { a: 1, b: { c: 2 } };
      const clonedObj = cloneObject(obj);
      expect(clonedObj).toEqual(obj);
      expect(clonedObj).not.toBe(obj);
    });
  });

  describe('compareProperty', () => {
    it('should return true if properties are equal', () => {
      const obj1 = { a: 1 };
      const obj2 = { a: 1 };
      expect(compareProperty(obj1, obj2, 'a')).toBeTrue();
    });

    it('should return false if properties are not equal', () => {
      const obj1 = { a: 1 };
      const obj2 = { a: 2 };
      expect(compareProperty(obj1, obj2, 'a')).toBeFalse();
    });
  });

  describe('compareObjects', () => {
    it('should return true if objects are equal', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 2 };
      expect(compareObjects(obj1, obj2)).toBeTrue();
    });

    it('should return false if objects are not equal', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 3, b: 4 };
      expect(compareObjects(obj1, obj2)).toBeFalse();
    });
  });

  describe('compareComplexObjects', () => {
    it('should return true for identical objects', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { a: 1, b: { c: 2 } };
      expect(compareComplexObjects(obj1, obj2)).toBeTrue();
    });

    it('should return false for different objects', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { a: 1, b: { c: 3 } };
      expect(compareComplexObjects(obj1, obj2)).toBeFalse();
    });

    it('should return true for objects with excluded properties', () => {
      const obj1 = { a: 1, b: { c: 2, d: 4 } };
      const obj2 = { a: 1, b: { c: 2, d: 5 } };
      const excludedProperties = ['d'];
      expect(compareComplexObjects(obj1, obj2, excludedProperties)).toBeTrue();
    });

    it('should handle null and undefined correctly', () => {
      const obj1 = { a: null, b: undefined };
      const obj2 = { a: null, b: undefined };
      expect(compareComplexObjects(obj1, obj2)).toBeTrue();
    });
  });

  describe('isNumberLike', () => {
    it('should return true for a number', () => {
      expect(isNumberLike(123)).toBeTrue();
    });

    it('should return true for a string representation of a number', () => {
      expect(isNumberLike('123')).toBeTrue();
    });

    it('should return false for a non-numeric string', () => {
      expect(isNumberLike('abc')).toBeFalse();
    });

    it('should return false for an array', () => {
      expect(isNumberLike([1, 2, 3])).toBeFalse();
    });

    it('should return false for an object', () => {
      expect(isNumberLike({ num: 123 })).toBeFalse();
    });

    it('should return false for null', () => {
      expect(isNumberLike(null)).toBeFalse();
    });

    it('should return false for undefined', () => {
      expect(isNumberLike(undefined)).toBeFalse();
    });

    it('should return false for a boolean value', () => {
      expect(isNumberLike(true)).toBeFalse();
      expect(isNumberLike(false)).toBeFalse();
    });
  });

  describe('lettersOnly', () => {
    function createKeyboardEvent(keyValue: string) {
      return new KeyboardEvent('keypress', { key: keyValue });
    }

    it('should return true for lowercase letters', () => {
      expect(lettersOnly(createKeyboardEvent('a'))).toBeTrue();
      expect(lettersOnly(createKeyboardEvent('z'))).toBeTrue();
    });

    it('should return true for uppercase letters', () => {
      expect(lettersOnly(createKeyboardEvent('A'))).toBeTrue();
      expect(lettersOnly(createKeyboardEvent('Z'))).toBeTrue();
    });

    it('should return false for numbers', () => {
      expect(lettersOnly(createKeyboardEvent('1'))).toBeFalse();
      expect(lettersOnly(createKeyboardEvent('0'))).toBeFalse();
    });

    it('should return false for special characters', () => {
      expect(lettersOnly(createKeyboardEvent('!'))).toBeFalse();
      expect(lettersOnly(createKeyboardEvent('@'))).toBeFalse();
      expect(lettersOnly(createKeyboardEvent('#'))).toBeFalse();
    });

    it('should return false for whitespace characters', () => {
      expect(lettersOnly(createKeyboardEvent(' '))).toBeFalse();
      expect(lettersOnly(createKeyboardEvent('\t'))).toBeFalse();
    });
  });

  describe('copyObjectValues', () => {
    it('should copy values from one object to another for matching properties', () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 10, b: 20, d: 40 };
      copyObjectValues(obj1, obj2);
      expect(obj1).toEqual({ a: 10, b: 20, c: 3 });
    });

    it('should not copy values for non-matching properties', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { c: 10, d: 20 };
      copyObjectValues(obj1, obj2);
      expect(obj1).toEqual({ a: 1, b: 2 });
    });

    it('should handle empty objects', () => {
      const obj1 = {};
      const obj2 = { a: 10, b: 20 };
      copyObjectValues(obj1, obj2);
      expect(obj1).toEqual({});
    });

    it('should not modify the source object', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 10, b: 20 };
      copyObjectValues(obj1, obj2);
      expect(obj2).toEqual({ a: 10, b: 20 });
    });
  });

  // Weitere Tests für compareComplexObjects, isNumberLike, lettersOnly, saveFilter, restoreFilter, copyObjectValues, createStringId, sortMultiFields...
});
