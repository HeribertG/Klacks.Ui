// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ScrollState {
  position: { horizontal: number; vertical: number };
  delta: { horizontal: number; vertical: number };
  max: { cols: number; rows: number };
  visible: { cols: number; rows: number };
}
