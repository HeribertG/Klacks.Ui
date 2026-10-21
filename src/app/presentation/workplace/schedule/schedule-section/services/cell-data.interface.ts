// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface CellData {
  mainText: string;
  firstSubText: string;
  secondSubText: string;
  backgroundColor?: string;
  fontColor?: string;
  isEmpty: boolean;
  sealed: boolean;
}
