// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TimeRangeService } from './time-range.service';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';

export interface SnapDirection {
  getEffectiveEdge: (startMinutes: number, endMinutes: number, timeRangeService: TimeRangeService, item: IContainerTemplateItem) => number;
  aggregate: typeof Math.min | typeof Math.max;
  boundaryCheck: (edge: number, boundary: number) => boolean;
  computeCandidate: (edge: number, pre: number, post: number, duration: number) => { start: number; end: number; effectiveStart: number; effectiveEnd: number };
}
