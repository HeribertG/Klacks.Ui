export class MultiLanguage implements IMultiLanguage {
  /**
   *
   */
  constructor() {
    this.de = '';
    this.en = '';
    this.fr = '';
    this.it = '';
  }
  [key: string]: string | undefined;
  de?: string | undefined = undefined;
  en?: string | undefined = undefined;
  fr?: string | undefined = undefined;
  it?: string | undefined = undefined;
}
export interface IMultiLanguage {
  de?: string | undefined;
  en?: string | undefined;
  fr?: string | undefined;
  it?: string | undefined;
  [key: string]: string | undefined;
}
