// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';

export interface ITimelineBlockRenderer {
  getColor(entry: IScheduleCell): string;
  getLabel(entry: IScheduleCell): string;
  drawShape(ctx: CanvasRenderingContext2D, rect: Rectangle, color: string): void;
}
