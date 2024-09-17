export const RGB_COLOR_REGEX = /\((\d+),\s*(\d+),\s*(\d+)(,\s*(\d*.\d*))?\)/;

export class Color {
  public r = 0;
  public g = 0;
  public b = 0;
  public a = 0;

  constructor(colorStr?: string);
  constructor(r?: string | number, g?: number, b?: number);
  constructor(r?: string | number, g?: number, b?: number, a?: number) {
    if (typeof r === 'string') {
      r = r.trim();
      if (r.indexOf('#') === 0) {
        r = r.substr(r.indexOf('#') + 1);
        if (r.length >= 1) {
          this.r = parseInt(r.substr(0, 2), 16);
        }
        if (r.length >= 2) {
          this.g = parseInt(r.substr(2, 2), 16);
        }
        if (r.length >= 4) {
          this.b = parseInt(r.substr(4, 2), 16);
        }
      } else if (r.indexOf('rgb') === 0) {
        const res = RGB_COLOR_REGEX.exec(r);
        this.r = parseInt(res![1], 10);
        this.g = parseInt(res![2], 10);
        this.b = parseInt(res![3], 10);
        this.a = res![5] ? parseFloat(res![5]) : 1;
      }
    } else {
      this.r = r!;
      this.g = g!;
      this.b = b!;
      this.a = a || 1;
    }
  }

  toHex() {
    let strR: string = this.r.toString(16);
    if (strR.length === 1) {
      strR = '0' + strR;
    }

    let strG: string = this.g.toString(16);
    if (strG.length === 1) {
      strG = '0' + strG;
    }

    let strB: string = this.b.toString(16);
    if (strB.length === 1) {
      strB = '0' + strB;
    }
    return '#' + strR + strG + strB;
  }

  toRgb() {
    return `rgb(${this.r}, ${this.g}, ${this.b})`;
  }
  toRgba1(a: number) {
    return `rgba( ${this.r}, ${this.g}, ${this.b},${a})`;
  }

  toRgba() {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }
}
