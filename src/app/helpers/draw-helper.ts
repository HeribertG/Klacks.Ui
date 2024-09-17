import {
  TextAlignmentEnum,
  BaselineAlignmentEnum,
} from '../grid/enums/cell-settings.enum';
import { Rectangle, Size } from '../grid/classes/geometry';
import { Color } from '../grid/classes/color';
import { Gradient3DBorderStyleEnum } from '../grid/enums/gradient-3d-border-style';

export abstract class DrawHelper {
  public static GetDarkColor(color: string, d: number): string {
    const maxBit = 255;
    let r = maxBit;
    let g = maxBit;
    let b = maxBit;

    if (!color) {
      throw new Error('color component is invalid.');
    }
    const c: Color = new Color(color);

    if (c.r > d) {
      r = c.r - d;
    }
    if (c.g > d) {
      g = c.g - d;
    }
    if (c.b > d) {
      b = c.b - d;
    }
    return new Color(r, g, b).toHex();
  }

  public static GetLightColor(color: string, d: number): string {
    const maxBit = 255;
    let r = maxBit;
    let g = maxBit;
    let b = maxBit;

    if (!color) {
      throw new Error('color component is invalid.');
    }
    const c: Color = new Color(color);

    if (c.r + d <= maxBit) {
      r = c.r + d;
    }
    if (c.g + d <= maxBit) {
      g = c.g + d;
    }
    if (c.b + d <= maxBit) {
      b = c.b + d;
    }

    return new Color(r, g, b).toHex();
  }

  public static drawBorder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    backgroundColor: string,
    deep: number,
    borderStyle = Gradient3DBorderStyleEnum.Raised
  ): void {
    if (deep > 1) {
      const darkColor: string = this.GetDarkColor(backgroundColor, 80);
      const lightColor: string = this.GetLightColor(backgroundColor, 250);
      this.drawGradient3DBorder(
        ctx,
        x,
        y,
        w,
        h,
        backgroundColor,
        darkColor,
        lightColor,
        deep,
        deep,
        borderStyle
      );
    }
  }

  public static drawGradient3DBorder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    currentBackColor: string,
    currentDarkColor: string,
    currentLightColor: string,
    currentDarkGradientNumber: number,
    currentLightGradientNumber: number,
    borderStyle: number
  ): void {
    let topLeft: string;
    let bottomRight: string;
    let topLeftWidth: number;
    let bottomRightWidth: number;

    if (borderStyle === Gradient3DBorderStyleEnum.Raised) {
      topLeft = currentLightColor;
      topLeftWidth = currentLightGradientNumber;
      bottomRight = currentDarkColor;
      bottomRightWidth = currentDarkGradientNumber;
    } else {
      topLeft = currentDarkColor;
      topLeftWidth = currentDarkGradientNumber;
      bottomRight = currentLightColor;
      bottomRightWidth = currentLightGradientNumber;
    }

    // TopLeftBorder
    const topLeftGradient: string[] = this.calculateColorGradient(
      currentBackColor,
      topLeft,
      topLeftWidth
    );

    for (let i = 0; i <= topLeftGradient.length - 1; i++) {
      ctx.beginPath();
      ctx.strokeStyle = topLeftGradient[topLeftGradient.length - 1 - i];
      ctx.lineWidth = 1;

      ctx.moveTo(w + x - (i + 1), y + i); // right -top
      ctx.lineTo(x + i, y + i); // Left-Top
      ctx.lineTo(x + i, h - (i + 1));

      ctx.stroke();
    }

    // BottomRightBorder
    const bottomRightGradient: string[] = this.calculateColorGradient(
      currentBackColor,
      bottomRight,
      bottomRightWidth
    );

    for (let i = 0; i <= bottomRightGradient.length - 1; i++) {
      ctx.beginPath();
      ctx.strokeStyle = bottomRightGradient[bottomRightGradient.length - 1 - i];
      ctx.lineWidth = 1;

      ctx.moveTo(x + i, h - (i + 1)); // left-Bottom
      ctx.lineTo(w + x - (i + 1), h - (i + 1)); // right-bottom
      ctx.lineTo(w + x - (i + 1), y + i); // right-top

      ctx.stroke();
    }

    ctx.beginPath();
  }

  public static calculateColorGradient(
    startColor: string,
    endColor: string,
    numberOfGradients: number
  ): string[] {
    const myColors: string[] = new Array(numberOfGradients - 1 + 1);
    const maxBit = 255;

    let IncrementR: number;
    let IncrementG: number;
    let IncrementB: number;

    const endColorClass = new Color(endColor);
    const startColorClass = new Color(startColor);

    IncrementR = endColorClass.r - startColorClass.r;
    IncrementR = Math.ceil(IncrementR / numberOfGradients);

    IncrementG = endColorClass.g - startColorClass.g;
    IncrementG = Math.ceil(IncrementG / numberOfGradients);

    IncrementB = endColorClass.b - startColorClass.b;
    IncrementB = Math.ceil(IncrementB / numberOfGradients);

    for (let i = 0; i <= myColors.length - 1; i++) {
      let r: number = startColorClass.r! + IncrementR * i;
      if (r > maxBit) {
        r = maxBit;
      }

      let g: number = startColorClass.g! + IncrementG * i;
      if (g > maxBit) {
        g = maxBit;
      }

      let b: number = startColorClass.b! + IncrementB * i;
      if (b > maxBit) {
        b = maxBit;
      }
      myColors[i] = new Color(r, g, b).toHex();
    }

    return myColors;
  }

  public static drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    font: string,
    fontSize: number,
    foregroundColor: string,
    textAlignment: TextAlignmentEnum,
    baselineAlignment: BaselineAlignmentEnum
  ): void {
    ctx.save();

    ctx.rect(x + 3, y + 1, w - 5, h - 2);
    ctx.clip();

    ctx.font = font;
    ctx.fillStyle = foregroundColor;
    ctx.textBaseline = 'top';

    let diffX = (w - ctx.measureText(text).width) / 2;
    if (textAlignment === TextAlignmentEnum.Left) {
      diffX = 3;
    } else if (textAlignment === TextAlignmentEnum.Right) {
      diffX = w - ctx.measureText(text).width - 2;
    }

    let diffY = (h - fontSize) / 2;
    if (baselineAlignment === BaselineAlignmentEnum.Top) {
      diffY = 1;
    } else if (baselineAlignment === BaselineAlignmentEnum.Bottom) {
      diffY = h - fontSize - 2;
    }

    ctx.fillText(text, Math.round(diffX + x), Math.round(diffY + y));

    ctx.restore();
  }

  public static createHiDPICanvas(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    setPixelRatio: boolean = true
  ): CanvasRenderingContext2D {
    const dpr = this.pixelRatio();
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    canvas.width = width;
    canvas.height = height;

    if (setPixelRatio) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      ctx!.scale(dpr, dpr);
    }

    return ctx!;
  }

  public static pixelRatio(): number {
    return Math.ceil(window.devicePixelRatio || 1);
  }

  public static createSVG(
    data: string,
    fillColor: string,
    strokeColor: string,
    backColor: string,
    width: number,
    height: number,
    StrokeThickness: number,
    viewSizeWidth: number,
    viewSizeHeight: number
  ): HTMLCanvasElement {
    const tempCanvas = document.createElement('canvas') as HTMLCanvasElement;

    const ctx = this.createHiDPICanvas(
      tempCanvas,
      viewSizeWidth,
      viewSizeHeight,
      true
    );
    this.setAntiAliasing(ctx);

    ctx.fillStyle = backColor;
    ctx.fillRect(0, 0, viewSizeWidth, viewSizeHeight);

    const p = new Path2D(data);

    ctx.fillStyle = fillColor;
    ctx.fill(p);

    ctx.lineWidth = StrokeThickness;
    ctx.strokeStyle = strokeColor;
    ctx.stroke(p);

    const correctSizeCanvas = document.createElement(
      'canvas'
    ) as HTMLCanvasElement;
    const ctx1 = correctSizeCanvas.getContext('2d', {
      willReadFrequently: true,
    }) as CanvasRenderingContext2D;
    this.setAntiAliasing(ctx1);
    correctSizeCanvas.height = height;
    correctSizeCanvas.width = width;

    ctx1.drawImage(
      tempCanvas,
      0,
      0,
      tempCanvas.width,
      tempCanvas.height,
      0,
      0,
      width,
      height
    );

    return correctSizeCanvas;
  }

  public static setAntiAliasing(context: CanvasRenderingContext2D): void {
    if (context) {
      context.imageSmoothingEnabled = true;
      (context as any).webkitImageSmoothingEnabled = true;
    }
  }

  public static fillRectangle(
    ctx: CanvasRenderingContext2D,
    backGroundColor: string,
    rec: Rectangle
  ): void {
    ctx.save();
    ctx.clearRect(rec.left, rec.top, rec.width, rec.height);
    ctx.fillStyle = backGroundColor;
    ctx.fillRect(rec.left, rec.top, rec.width, rec.height);
    ctx.restore();
  }

  public static drawBaseBorder(
    ctx: CanvasRenderingContext2D,
    borderColor: string,
    lineWidth: number,
    rec: Rectangle
  ): void {
    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(
      rec.left,
      rec.top,
      rec.width + lineWidth,
      rec.height + lineWidth
    );
    ctx.restore();
  }

  public static drawSelectionBorder(
    ctx: CanvasRenderingContext2D,
    rec: Rectangle
  ): void {
    ctx.save();
    ctx.strokeStyle = '#454545';
    ctx.lineWidth = 1;
    ctx.setLineDash([1, 2]);
    ctx.strokeRect(rec.left, rec.top, rec.width, rec.height);
    ctx.restore();
  }

  public static drawAnchor(
    ctx: CanvasRenderingContext2D,
    rec: Rectangle
  ): void {
    ctx.save();
    const centerX = rec.left + rec.width / 2;
    const centerY = rec.top + rec.height / 2;
    ctx.beginPath();

    ctx.strokeStyle = '#454545';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'white';
    ctx.arc(centerX, centerY, rec.height / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  public static isCanvasReady(canvas: HTMLCanvasElement | undefined): boolean {
    if (!canvas) {
      return false;
    }
    if (canvas.width === 0) {
      return false;
    }
    if (canvas.height === 0) {
      return false;
    }
    return true;
  }

  public static drawImageDirect(
    ctx: CanvasRenderingContext2D,
    rec: Rectangle,
    path: string
  ) {
    const image = new Image();
    image.src = path;
    image.width = rec.width;
    image.height = rec.height;
    ctx.drawImage(image, rec.left, rec.top, rec.width, rec.height);
  }

  public static drawImage(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    rec: Rectangle,
    opacity: number | undefined
  ): void {
    ctx.save();

    if (opacity) {
      ctx.globalAlpha = opacity;
    }

    ctx.drawImage(image, rec.left, rec.top, rec.width, rec.height);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  public static createImage(size: Size, path: string): HTMLImageElement {
    const image = new Image();
    image.src = path;
    image.width = size.width;
    image.height = size.height;

    return image;
  }

  public static roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
