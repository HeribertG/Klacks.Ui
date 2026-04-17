// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Timeline block renderer for WorkChange entries (corrections and replacements).
 * Uses the same background color as the table-view cell formatter so both views
 * stay visually aligned for the user.
 * @param entry - Schedule entry whose abbreviation is used as block label
 */
import { inject, Injectable } from '@angular/core';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { ITimelineBlockRenderer } from './timeline-block-renderer.interface';

@Injectable()
export class WorkChangeBlockRendererService implements ITimelineBlockRenderer {
  private gridColors = inject(GridColorService);

  getColor(_entry: IScheduleCell): string {
    return this.gridColors.workChangeColor;
  }

  getLabel(entry: IScheduleCell): string {
    return entry.abbreviation ?? '';
  }

  drawShape(ctx: CanvasRenderingContext2D, rect: Rectangle, color: string): void {
    DrawHelper.fillRectangle(ctx, color, rect);
  }
}
