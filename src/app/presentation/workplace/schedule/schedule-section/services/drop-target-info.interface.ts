// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface DropTargetInfo {
  row: number;
  clientId: string;
  date: Date;
  isEmpty: boolean;
  isBeforeClientStart: boolean;
}
