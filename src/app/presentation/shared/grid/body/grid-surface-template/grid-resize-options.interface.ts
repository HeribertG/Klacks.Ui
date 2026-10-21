// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface GridResizeOptions {
  /** Emits after a resize has been applied so scrollbars/viewport can refresh. */
  onResized: () => void;
  /** Diagnostic tag when ResizeObserver is unavailable. */
  nameId: string;
}
