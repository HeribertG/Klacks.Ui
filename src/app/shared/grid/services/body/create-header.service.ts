import { inject, Injectable } from '@angular/core';
import { GridColorService } from 'src/app/shared/grid/services/grid-color.service';
import { Gradient3DBorderStyleEnum } from 'src/app/shared/grid/enums/gradient-3d-border-style';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { GridFontsService } from 'src/app/shared/grid/services/grid-fonts.service';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from 'src/app/shared/grid/enums/cell-settings.enum';
import { GridSettingsService } from 'src/app/shared/grid/services/grid-settings.service';
import { TranslateService } from '@ngx-translate/core';
import { Rectangle } from 'src/app/shared/grid/classes/geometry';
import { BaseSettingsService } from 'src/app/shared/grid/services/data-setting/settings.service';
import { BaseDataService } from 'src/app/shared/grid/services/data-setting/data.service';

@Injectable()
export class BaseCreateHeaderService {
  protected settings = inject(BaseSettingsService);
  protected gridColors = inject(GridColorService);
  protected gridFonts = inject(GridFontsService);
  protected gridSettings = inject(GridSettingsService);
  protected gridData = inject(BaseDataService);
  private translateService = inject(TranslateService);

  private emptyHeader: ImageData | undefined = undefined;

  private iconWidth = this.settings.rowHeaderIconWith;
  private iconHeight = this.settings.rowHeaderIconHeight;
  private zoom = this.settings.zoom;

  private init(): void {
    this.iconWidth = this.settings.rowHeaderIconWith;
    this.iconHeight = this.settings.rowHeaderIconHeight;
    this.zoom = this.settings.zoom;
    const tempCanvas = document.createElement('canvas');
    const ctx = DrawHelper.createHiDPICanvas(
      tempCanvas,
      this.settings.cellWidth,
      this.settings.cellHeaderHeight,
      true
    );
    if (ctx) {
      ctx.fillStyle = this.gridColors.headerBackGroundColor;
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      DrawHelper.drawBorder(
        ctx,
        0,
        0,
        tempCanvas.width,
        tempCanvas.height,
        this.gridColors.headerBackGroundColor,
        1,
        Gradient3DBorderStyleEnum.Raised
      );

      this.emptyHeader = ctx.getImageData(
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      );
    }
  }

  reset(): void {
    this.emptyHeader = undefined;
  }

  createHeaderCell(col: number): HTMLCanvasElement | undefined {
    if (this.emptyHeader === undefined) {
      this.init();
    }

    const tempCanvas: HTMLCanvasElement = document.createElement('canvas');

    if (tempCanvas) {
      const ctx = DrawHelper.createHiDPICanvas(
        tempCanvas,
        this.settings.cellWidth,
        this.settings.cellHeaderHeight,
        true
      );

      if (ctx) {
        DrawHelper.setAntiAliasing(ctx);

        this.fillHeaderBackground(ctx);
        this.drawBorder(ctx, this.settings.headerBorderWidth);
        this.drawText(ctx, this.getTitle(col));

        return tempCanvas;
      }
    }
    return undefined;
  }

  getTitle(column: number): string {
    if (this.gridData.indexes) {
      const today: Date = new Date(this.gridData.startDate!);
      today.setDate(today.getDate() + column);

      return this.formatDate(today);
    }
    return '';
  }

  public drawText(ctx: CanvasRenderingContext2D, text: string): void {
    DrawHelper.drawText(
      ctx,
      text,
      0,
      0,
      this.settings.cellWidth,
      this.settings.cellHeaderHeight,
      this.gridFonts.headerFontStringZoom,
      this.gridFonts.headerFontHeightZoom,
      this.gridColors.headerForeGroundColor,
      TextAlignmentEnum.Center,
      BaselineAlignmentEnum.Center
    );
  }

  private formatDate(date: Date): string {
    const day = date.getDate();
    return (
      this.translateService.instant(this.gridSettings.weekday[date.getDay()]) +
      ' ' +
      day +
      '. '
    );
  }

  createRowHeaderHeader(ctx: CanvasRenderingContext2D, width: number): void {
    ctx.canvas.width = width;
    ctx.canvas.height = this.settings.cellHeaderHeight;

    ctx.fillStyle = this.gridColors.controlBackGroundColor;

    this.fillHeaderBackground(ctx);

    this.drawBorder(ctx, this.settings.headerBorderWidth);

    this.drawTitle(
      ctx,
      this.translateService.instant('schedule.row-header.headline') +
        ' (' +
        this.gridData.indexes.toString() +
        ')'
    );
  }

  private drawTitle(ctx: CanvasRenderingContext2D, text: string): void {
    DrawHelper.drawText(
      ctx,
      text,
      0,
      0,
      ctx.canvas.width,
      this.settings.cellHeaderHeight,
      this.gridFonts.headerFontStringZoom,
      this.gridFonts.headerFontHeightZoom,
      this.gridColors.headerForeGroundColor,
      TextAlignmentEnum.Center,
      BaselineAlignmentEnum.Center
    );
  }

  private fillHeaderBackground(ctx: CanvasRenderingContext2D): void {
    DrawHelper.fillRectangle(
      ctx,
      this.gridColors.controlBackGroundColor,
      new Rectangle(0, 0, ctx.canvas.width, this.settings.cellHeaderHeight)
    );
  }
  private drawBorder(ctx: CanvasRenderingContext2D, deep = 2): void {
    DrawHelper.drawBorder(
      ctx,
      0,
      0,
      ctx.canvas.width,
      this.settings.cellHeaderHeight,
      this.gridColors.controlBackGroundColor,
      deep,
      Gradient3DBorderStyleEnum.Raised
    );
  }
}
