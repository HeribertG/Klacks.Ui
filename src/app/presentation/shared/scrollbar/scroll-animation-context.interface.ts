// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ScrollAnimationContext {
  getValue: () => number;
  getMaxValue: () => number;
  getVisibleValue: () => number;
  getTickSize: () => number;
  getThumbSize: () => number;
  getCanvasOffset: () => number;
  getMousePosition: () => number | null;
  isScrollbarClick: () => boolean;
  updateValue: (newValue: number) => void;
  emitValueChange: () => void;
  onStopAnimation: () => void;
}
