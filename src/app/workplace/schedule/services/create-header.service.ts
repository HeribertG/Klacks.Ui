import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { Gradient3DBorderStyleEnum } from 'src/app/grid/enums/gradient-3d-border-style';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { GridFontsService } from 'src/app/grid/services/grid-fonts.service';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from 'src/app/grid/enums/cell-settings.enum';
import { GridSettingsService } from 'src/app/grid/services/grid-settings.service';
import { TranslateService } from '@ngx-translate/core';
import { DataService } from './data.service';
import { Rectangle } from 'src/app/grid/classes/geometry';

@Injectable()
export class CreateHeaderService {
  private emptyHeader: ImageData | undefined = undefined;

  private iconWidth = this.settings.rowHeaderIconWith;
  private iconHeight = this.settings.rowHeaderIconHeight;
  private zoom = this.settings.zoom;

  constructor(
    private settings: SettingsService,
    private gridColors: GridColorService,
    private gridFonts: GridFontsService,
    private gridSettings: GridSettingsService,
    private gridData: DataService,
    private translateService: TranslateService
  ) {}

  private init(): void {
    this.iconWidth = this.settings.rowHeaderIconWith;
    this.iconHeight = this.settings.rowHeaderIconHeight;
    this.zoom = this.settings.zoom;
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (ctx) {
      tempCanvas.width = this.settings.cellWidth;
      tempCanvas.height = this.settings.cellHeaderHeight;

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

  createHeader(col: number): ImageData | undefined {
    if (this.emptyHeader === undefined) {
      this.init();
    }

    const tempCanvas: HTMLCanvasElement = document.createElement(
      'canvas'
    ) as HTMLCanvasElement;

    if (tempCanvas) {
      tempCanvas.width = this.settings.cellWidth;
      tempCanvas.height = this.settings.cellHeaderHeight;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        this.fillHeaderBackground(ctx);
        this.drawBorder(ctx, this.settings.headerBorderWidth);
        this.drawText(ctx, this.getTitle(col));

        return ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      }
    }
    return undefined;
  }

  getTitle(column: number): string {
    if (this.gridData.startDate) {
      const today: Date = new Date(this.gridData.startDate);
      today.setDate(today.getDate() + column);

      return this.formatDate(today);
    }
    return '';
  }

  private drawText(ctx: CanvasRenderingContext2D, text: string): void {
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
