// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ITimeBlockResult {
  id: string;
  startTime: string;
  endTime: string;
  insertionPosition: number;
  isMovable: boolean;
}
