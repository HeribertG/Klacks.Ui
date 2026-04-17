// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';

export interface ITimelineBlockRenderer {
  getColor(entry: IScheduleCell): string;
  getLabel(entry: IScheduleCell): string;
  drawShape(ctx: CanvasRenderingContext2D, rect: Rectangle, color: string): void;
}
