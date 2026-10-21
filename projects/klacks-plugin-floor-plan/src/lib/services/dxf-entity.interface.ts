// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface DxfEntity {
  type: string;
  props: Record<string, string | number | { x: number; y: number }[]>;
  _nextIndex: number;
}
