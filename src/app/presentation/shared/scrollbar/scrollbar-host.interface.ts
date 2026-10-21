// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ScrollbarViewport } from './scrollbar-viewport.interface';

export interface ScrollbarHost extends ScrollbarViewport {
  updateValue(value: number): void;
  emitValueChange(): void;
  reDraw(): void;
  refresh(): void;
  updateArrowButtonsState(): void;
}
