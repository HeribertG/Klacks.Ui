// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Signal } from '@angular/core';

export interface IProgressLoader {
  readonly isRead: Signal<number> | Signal<boolean> | (() => boolean) | (() => number);
  readonly loadingProgress: number;
  readonly hasMore: boolean;
}
