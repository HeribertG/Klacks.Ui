// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Timeline block renderer for Work entries.
 * Renders a filled rectangle with a 3D raised border to distinguish the primary
 * shift block from surrounding WorkChange and Break shapes.
 * @param gridColors - Provides the control background color used for the work fill
 */
import { inject, Injectable } from '@angular/core';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { Gradient3DBorderStyleEnum } from 'src/app/presentation/shared/grid/enums/gradient-3d-border-style';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { ITimelineBlockRenderer } from './timeline-block-renderer.interface';

@Injectable()
export class WorkBlockRendererService implements ITimelineBlockRenderer {
  private gridColors = inject(GridColorService);

  private readonly borderDepth = 2;

  getColor(_entry: IScheduleCell): string {
    return this.gridColors.controlBackGroundColor;
  }

  getLabel(entry: IScheduleCell): string {
    return entry.abbreviation ?? '';
  }

  drawShape(ctx: CanvasRenderingContext2D, rect: Rectangle, color: string): void {
    DrawHelper.fillRectangle(ctx, color, rect);
    DrawHelper.drawBorder(
      ctx,
      rect.left,
      rect.top,
      rect.right - rect.left,
      rect.bottom,
      color,
      this.borderDepth,
      Gradient3DBorderStyleEnum.Raised,
    );
  }
}
