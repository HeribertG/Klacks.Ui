// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Timeline block renderer for WorkChange entries (corrections and replacements).
 * Renders a flat-filled rectangle without a 3D border so WorkChange reads as a
 * secondary overlay compared to primary Work blocks.
 * @param entry - Schedule entry whose abbreviation is used as block label
 */
import { Injectable } from '@angular/core';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { ITimelineBlockRenderer } from './timeline-block-renderer.interface';

@Injectable()
export class WorkChangeBlockRendererService implements ITimelineBlockRenderer {
  private readonly workChangeColor = 'rgb(149, 185, 208)';

  getColor(_entry: IScheduleCell): string {
    return this.workChangeColor;
  }

  getLabel(entry: IScheduleCell): string {
    return entry.abbreviation ?? '';
  }

  drawShape(ctx: CanvasRenderingContext2D, rect: Rectangle, color: string): void {
    DrawHelper.fillRectangle(ctx, color, rect);
  }
}
