import { DrawHelper } from './draw-helper';

export abstract class DrawImageHelper {
  /**
   * Draws an image with proper HiDPI scaling consideration
   * @param ctx The canvas context
   * @param image Source canvas or image
   * @param dx Destination X coordinate
   * @param dy Destination Y coordinate
   * @param dWidth Optional destination width (if not provided, uses source width)
   * @param dHeight Optional destination height (if not provided, uses source height)
   * @param sx Optional source X coordinate (default 0)
   * @param sy Optional source Y coordinate (default 0)
   * @param sWidth Optional source width (if not provided, uses full source width)
   * @param sHeight Optional source height (if not provided, uses full source height)
   */
  public static drawImageScaled(
    ctx: CanvasRenderingContext2D,
    image: HTMLCanvasElement | HTMLImageElement,
    dx: number,
    dy: number,
    dWidth?: number,
    dHeight?: number,
    sx = 0,
    sy = 0,
    sWidth?: number,
    sHeight?: number
  ): void {
    // Get the actual source dimensions
    const sourceWidth = sWidth || image.width;
    const sourceHeight = sHeight || image.height;

    // Get the destination dimensions (default to source if not provided)
    const destWidth = dWidth || sourceWidth;
    const destHeight = dHeight || sourceHeight;

    // Use the full drawImage signature for proper scaling
    ctx.drawImage(
      image,
      sx,
      sy,
      sourceWidth,
      sourceHeight, // source rectangle
      dx,
      dy,
      destWidth,
      destHeight // destination rectangle
    );
  }

  /**
   * Draws a canvas onto another canvas with logical dimensions
   * This ensures that HiDPI canvases are drawn at their intended logical size
   */
  public static drawCanvasLogical(
    ctx: CanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement,
    dx: number,
    dy: number,
    logicalWidth?: number,
    logicalHeight?: number
  ): void {
    // Get logical dimensions from style if available, otherwise use provided dimensions
    let destWidth = logicalWidth;
    let destHeight = logicalHeight;

    if (!destWidth && sourceCanvas.style.width) {
      destWidth = parseInt(sourceCanvas.style.width);
    }
    if (!destHeight && sourceCanvas.style.height) {
      destHeight = parseInt(sourceCanvas.style.height);
    }

    // Fallback to canvas dimensions if no logical size is available
    if (!destWidth) destWidth = sourceCanvas.width;
    if (!destHeight) destHeight = sourceCanvas.height;

    this.drawImageScaled(
      ctx,
      sourceCanvas,
      dx,
      dy,
      destWidth,
      destHeight,
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height
    );
  }

  /**
   * Creates a temporary canvas with proper HiDPI scaling for image operations
   */
  public static createTempCanvasWithScaling(sourceCanvas: HTMLCanvasElement): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  } {
    const tempCanvas = document.createElement('canvas');

    // Copy style dimensions if available
    if (sourceCanvas.style.width) {
      tempCanvas.style.width = sourceCanvas.style.width;
    }
    if (sourceCanvas.style.height) {
      tempCanvas.style.height = sourceCanvas.style.height;
    }

    // Set physical dimensions to match source
    tempCanvas.width = sourceCanvas.width;
    tempCanvas.height = sourceCanvas.height;

    const tempCtx = tempCanvas.getContext('2d')!;

    // Apply scaling if needed
    const dpr = DrawHelper.pixelRatio();
    tempCtx.scale(dpr, dpr);

    return { canvas: tempCanvas, ctx: tempCtx };
  }

  /**
   * Utility method to get logical dimensions from a canvas
   */
  public static getLogicalDimensions(canvas: HTMLCanvasElement): {
    width: number;
    height: number;
  } {
    let width = canvas.width;
    let height = canvas.height;

    if (canvas.style.width) {
      width = parseInt(canvas.style.width);
    }
    if (canvas.style.height) {
      height = parseInt(canvas.style.height);
    }

    return { width, height };
  }
}
