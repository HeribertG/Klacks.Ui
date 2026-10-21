// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Interface for scroll controller.
 * Provides access to scroll position and scroll operations.
 */
export interface IScrollController {
  /** Current horizontal scroll position */
  horizontalScrollPosition: number;
  
  /** Current vertical scroll position */
  verticalScrollPosition: number;
}
