// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IShift } from '../shift/shift.interface';
import { IContainerTemplateSlot } from './container-template-slot';

export interface IContainerTemplateGrid {
  containerShift: IShift;
  slots: IContainerTemplateSlot[][];
  crossesMidnight: boolean;
  totalRows: number;
  totalDays: number;
}
