import { Rectangle } from './geometry';

describe('Rectangle', () => {
  let rect = new Rectangle();

  beforeEach(() => {
    rect = new Rectangle();
  });

  describe('isEmpty', () => {
    it('should return true for a newly created rectangle', () => {
      expect(rect.isEmpty()).toBe(true);
    });

    it('should return false for a rectangle with non-zero dimensions', () => {
      rect.setBounds(0, 0, 10, 10);
      expect(rect.isEmpty()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true when comparing a rectangle to itself', () => {
      expect(rect.equals(rect)).toBe(true);
    });

    it('should return false when comparing to a different rectangle', () => {
      let anotherRect = new Rectangle(0, 0, 10, 10);
      expect(rect.equals(anotherRect)).toBe(false);
    });
  });

  describe('translate', () => {
    it('should correctly translate the rectangle', () => {
      rect.setBounds(0, 0, 10, 10);
      rect.translate(5, 5);
      expect(rect.left).toBe(5);
      expect(rect.top).toBe(5);
      expect(rect.right).toBe(15);
      expect(rect.bottom).toBe(15);
    });
  });
});
