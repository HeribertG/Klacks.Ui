// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import type { IScrollController } from './scroll-controller.interface';

// Extended interface for scroll service with setter
export interface IScrollControllerWithVertical extends IScrollController {
  verticalScrollPosition: number;
}
