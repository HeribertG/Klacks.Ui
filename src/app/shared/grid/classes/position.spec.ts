import { MyPosition, MyPositionCollection } from './position';

describe('MyPosition', function () {
  it('should initialize with default values', function () {
    const position = new MyPosition();
    expect(position.row).toBe(-1);
    expect(position.column).toBe(-1);
  });

  it('should initialize with provided values', function () {
    const position = new MyPosition(2, 3);
    expect(position.row).toBe(2);
    expect(position.column).toBe(3);
  });

  it('isEmpty should return true for default values', function () {
    const position = new MyPosition();
    expect(position.isEmpty()).toBe(true);
  });

  it('isEmpty should return false for non-default values', function () {
    const position = new MyPosition(1, 1);
    expect(position.isEmpty()).toBe(false);
  });

  it('isEqual should return true for same values', function () {
    const position1 = new MyPosition(2, 3);
    const position2 = new MyPosition(2, 3);
    expect(position1.isEqual(position2)).toBe(true);
  });

  it('isEqual should return false for different values', function () {
    const position1 = new MyPosition(2, 3);
    const position2 = new MyPosition(3, 2);
    expect(position1.isEqual(position2)).toBe(false);
  });
});

describe('MyPositionCollection', function () {
  let collection = new MyPositionCollection();

  beforeEach(function () {
    collection = new MyPositionCollection();
  });

  it('should start empty', function () {
    expect(collection.count()).toBe(0);
  });

  it('should add a position', function () {
    collection.add(new MyPosition(1, 1));
    expect(collection.count()).toBe(1);
  });

  it('should clear all positions', function () {
    collection.add(new MyPosition(1, 1));
    collection.clear();
    expect(collection.count()).toBe(0);
  });
});
