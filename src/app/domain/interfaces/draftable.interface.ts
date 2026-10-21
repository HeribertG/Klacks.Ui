// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IDraftable {
  captureDraft(): unknown | null;
  restoreDraft(draft: unknown): void;
}
