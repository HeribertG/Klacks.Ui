// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { KeywordWishItem } from './keyword-wish-item.interface';

export interface KeywordWishes {
  brokenFree: number;
  brokenOnly: number;
  brokenNo: number;
  unfulfilled: number;
  items: KeywordWishItem[];
}
