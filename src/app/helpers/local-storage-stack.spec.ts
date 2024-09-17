import {
  LocalStorageStack,
  countItemInStack,
  deleteStack,
  popFromStack,
  pushOnStack,
} from './local-storage-stack';

describe('LocalStorageStack', () => {
  // Clears the localStorage before each test
  beforeEach(() => {
    localStorage.clear();
  });

  // Test for pushOnStack function
  describe('pushOnStack', () => {
    it('should push a value onto the stack', () => {
      pushOnStack('test');
      expect(localStorage.getItem(LocalStorageStack.KEY)).toEqual('["test"]');
    });

    it('should not push a duplicate of the last element', () => {
      pushOnStack('test');
      pushOnStack('test');
      expect(localStorage.getItem(LocalStorageStack.KEY)).toEqual('["test"]');
    });
  });

  // Test for popFromStack function
  describe('popFromStack', () => {
    it('should pop the last value from the stack', () => {
      pushOnStack('test1');
      pushOnStack('test2');
      const popped = popFromStack();
      expect(popped).toBe('test2');
      expect(localStorage.getItem(LocalStorageStack.KEY)).toEqual('["test1"]');
    });

    it('should return an empty string if the stack is empty', () => {
      const popped = popFromStack();
      expect(popped).toBe('');
    });
  });

  // Test for countItemInStack function
  describe('countItemInStack', () => {
    it('should return the correct number of items in the stack', () => {
      pushOnStack('test1');
      pushOnStack('test2');
      expect(countItemInStack()).toBe(2);
    });
  });

  // Test for deleteStack function
  describe('deleteStack', () => {
    it('should delete the stack from localStorage', () => {
      pushOnStack('test');
      deleteStack();
      expect(localStorage.getItem(LocalStorageStack.KEY)).toBeNull();
    });
  });
});
