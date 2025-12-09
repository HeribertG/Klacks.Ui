import { inject, Injectable } from '@angular/core';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { Gradient3DBorderStyleEnum } from 'src/app/presentation/shared/grid/enums/gradient-3d-border-style';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { ShiftDataService } from '../../services/shift-data.service';
import { ShiftRowHeaderCanvasService } from './shift-row-header-canvas.service';
import { ShiftRowHeaderIconsService } from './shift-row-header-icons.service';

@Injectable()
export class ShiftCreateRowHeaderService {
  private settings = inject(BaseSettingsService);
  private gridColors = inject(GridColorService);
  private gridFonts = inject(GridFontsService);
  private dataService = inject(BaseDataService);
  private canvasManager = inject(ShiftRowHeaderCanvasService);
  private shiftIcons = inject(ShiftRowHeaderIconsService);

  private get shiftData(): ShiftDataService {
    return this.dataService as ShiftDataService;
  }

  private margin = 4;
  private borderWidth = 2;
  private iconWidth = 24;
  private iconHeight = 24;

  reset(): void {
    this.shiftIcons.reset(this.iconWidth, this.iconHeight);
  }

  drawRow(row: number, yPosition: number, isFirstVisibleRow: boolean): void {
    if (!this.canvasManager.renderCanvasCtx) return;

    const ctx = this.canvasManager.renderCanvasCtx;
    const width = this.canvasManager.width;
    const height = this.settings.cellHeight;

    const topOffset = isFirstVisibleRow ? 2 : 0;
    const adjustedY = yPosition + topOffset;
    const rec = new Rectangle(0, adjustedY, width, adjustedY + height - 1);

    if (row < this.shiftData.rows) {
      this.fillBackground(ctx, rec);
      this.drawBorder(ctx, rec);
      this.drawIcon(ctx, row, rec);
      this.drawShiftName(ctx, row, rec);
    } else {
      this.fillEmptyBackground(ctx, rec);
    }
  }

  private fillBackground(ctx: CanvasRenderingContext2D, rec: Rectangle): void {
    DrawHelper.fillRectangle(ctx, this.gridColors.controlBackGroundColor, rec);
  }

  private fillEmptyBackground(ctx: CanvasRenderingContext2D, rec: Rectangle): void {
    DrawHelper.fillRectangle(ctx, this.gridColors.backGroundContainerColor, rec);
  }

  private drawBorder(ctx: CanvasRenderingContext2D, rec: Rectangle): void {
    DrawHelper.drawBorder(
      ctx,
      rec.left,
      rec.top,
      rec.width,
      rec.height,
      this.gridColors.controlBackGroundColor,
      this.borderWidth,
      Gradient3DBorderStyleEnum.Raised
    );
  }

  private drawIcon(ctx: CanvasRenderingContext2D, row: number, rec: Rectangle): void {
    const isSporadic = this.shiftData.getShiftIsSporadic(row);
    const isTimeRange = this.shiftData.getShiftIsTimeRange(row);
    const shiftType = this.shiftData.getShiftType(row);
    const isContainer = shiftType === 1;

    let icon: HTMLCanvasElement | undefined;

    if (isContainer) {
      icon = this.shiftIcons.containerPicto;
    } else if (isSporadic) {
      icon = this.shiftIcons.unknownTimePicto;
    } else if (isTimeRange) {
      icon = this.shiftIcons.timeWindowPicto;
    } else {
      icon = this.shiftIcons.shiftSegmentPicto;
    }

    if (icon) {
      const iconX = rec.left + this.margin;
      const iconY = rec.top + (rec.height - this.iconHeight) / 2;
      ctx.drawImage(icon, iconX, iconY, this.iconWidth, this.iconHeight);
    }
  }

  private drawShiftName(ctx: CanvasRenderingContext2D, row: number, rec: Rectangle): void {
    const shiftName = this.shiftData.getShiftName(row);
    const workTime = this.shiftData.getShiftWorkTime(row);
    const formattedWorkTime = this.shiftData.formatWorkTime(workTime);
    const displayText = `${shiftName} (${formattedWorkTime})`;
    const textStartX = rec.left + this.margin + this.iconWidth + this.margin;

    DrawHelper.drawText(
      ctx,
      displayText,
      textStartX,
      rec.top,
      rec.width - textStartX - this.margin,
      rec.height,
      this.gridFonts.mainFontString,
      +this.gridFonts.mainFontSize,
      this.gridColors.foreGroundColor,
      TextAlignmentEnum.Left,
      BaselineAlignmentEnum.Center
    );
  }
}

