import { DrawHelper } from './draw-helper';

describe('DrawHelper', () => {
  let canvas: HTMLCanvasElement;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let ctx;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
  });

  describe('GetDarkColor', () => {
    it('should return a darker color', () => {
      const originalColor = '#FFFFFF';
      const darkenedColor = DrawHelper.GetDarkColor(originalColor, 10);

      expect(darkenedColor).not.toEqual(originalColor);
    });
  });

  describe('GetLightColor', () => {
    it('should return a lighter color', () => {
      const originalColor = '#454545';
      const lighteredColor = DrawHelper.GetLightColor(originalColor, 10);

      expect(lighteredColor).not.toEqual(originalColor);
    });
  });

  it('should throw an error if color or d is not provided', () => {
    expect(() => DrawHelper.GetDarkColor('', 10)).toThrowError(
      'color component is invalid.'
    );
  });

  it('should throw an error if color or d is not provided', () => {
    expect(() => DrawHelper.GetDarkColor('', 10)).toThrowError(
      'color component is invalid.'
    );
  });

  // describe('createHiDPICanvas', () => {
  //   it('should create and return a canvas rendering context', () => {
  //     const context = DrawHelper.createHiDPICanvas(canvas, 100, 100);

  //     expect(context).toBeDefined();
  //     expect(canvas.width).toBe(100);
  //     expect(canvas.height).toBe(100);
  //   });
  // });
});
