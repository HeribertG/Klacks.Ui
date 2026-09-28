// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IShift } from './shift-class';

export interface CutOperation {
  type: 'CREATE' | 'UPDATE';
  parentId: string;
  data: IShift;
}
