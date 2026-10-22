// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface PendingBlobTab {
  show(blob: Blob, fallbackFileName: string): void;
  cancel(): void;
}
