// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IMultiLanguage } from './multi-language.interface';

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
