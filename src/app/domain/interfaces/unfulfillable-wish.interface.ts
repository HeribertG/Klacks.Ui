// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export type UnfulfillableWishStatus = 'ready' | 'unfulfillable';

export interface IUnfulfillableWish {
  id: string;
  intentExcerpt: string;
  locale: string;
  status: UnfulfillableWishStatus;
  occurrenceCount: number;
  distinctUserCount: number;
  firstSeen: string;
  lastSeen: string;
  lastError: string | null;
}
