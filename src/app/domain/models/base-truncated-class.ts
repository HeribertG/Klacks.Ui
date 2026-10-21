// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseTruncated } from './base-truncated.interface';

export class BaseTruncated implements IBaseTruncated {
  maxItems = 0;
  maxPages = 0;
  currentPage = 1;
  firstItemOnPage = 0;
}
