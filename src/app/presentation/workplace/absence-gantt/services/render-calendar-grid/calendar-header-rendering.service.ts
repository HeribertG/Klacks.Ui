// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { CalendarHeaderDayRank } from 'src/app/domain/models/absence/absence-class';
import { CalendarSettingService } from '../calendar-setting.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from '../../../../shared/grid/services/grid-fonts.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from '../../../../shared/grid/enums/cell-settings.enum';
import { CanvasAvailable } from 'src/app/domain/services/canvasAvailable.decorator';

@Injectable()
export class CalendarHeaderRenderingService {
  private ganttCanvasManager = inject(GanttCanvasManagerService);
  private gridColors = inject(GridColorService);
  private calendarSetting = inject(CalendarSettingService);
  private gridFonts = inject(GridFontsService);

  private readonly MINCELLWITHFORDAYRANK = 20;

  public isCanvasAvailable(): boolean {
    return this.ganttCanvasManager.isCanvasAvailable();
  }

  @CanvasAvailable('queue')
  public copyRulerOnHeadline(): void {
    this.ganttCanvasManager.headerCtx!.drawImage(
      this.ganttCanvasManager.backgroundRowCanvas!,
      0,
      this.calendarSetting.cellHeight
    );
  }

  @CanvasAvailable('queue')
  public drawWeekendDayNumberOnHeadline(
    headerDayRank: CalendarHeaderDayRank[]
  ): void {
    if (this.calendarSetting.cellWidth * 2 >= this.MINCELLWITHFORDAYRANK) {
      headerDayRank.forEach((x) => {
        if (this.ganttCanvasManager.headerCtx!) {
          DrawHelper.fillRectangle(
            this.ganttCanvasManager.headerCtx!,
            x.backColor,
            x.rect
          );

          DrawHelper.drawText(
            this.ganttCanvasManager.headerCtx!,
            x.name,
            x.rect.left,
            x.rect.top,
            x.rect.width,
            x.rect.height,
            this.gridFonts.firstSubFontName,
            +this.gridFonts.firstSubFontSize,
            this.gridColors.foreGroundColor,
            TextAlignmentEnum.Center,
            BaselineAlignmentEnum.Center
          );
        }
      });
    }
  }
}
