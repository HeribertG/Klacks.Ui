import { inject, Injectable } from '@angular/core';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { Gradient3DBorderStyleEnum } from 'src/app/presentation/shared/grid/enums/gradient-3d-border-style';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import {
  BaselineAlignmentEnum,
  HeaderCellTypeEnum,
  TextAlignmentEnum,
} from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { TranslateService } from '@ngx-translate/core';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { PaymentInterval } from 'src/app/domain/models/contract-class';

@Injectable()
export class BaseCreateHeaderService {
  protected settings = inject(BaseSettingsService);
  protected gridColors = inject(GridColorService);
  protected gridFonts = inject(GridFontsService);
  protected gridSettings = inject(GridSettingsService);
  protected gridData = inject(BaseDataService);
  private translateService = inject(TranslateService);
  private settingsService = inject(DataManagementSettingsService);

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

        this.fillHeaderBackground(ctx, this.settings.cellWidth);
        this.drawBorder(ctx, this.settings.headerBorderWidth, 2);
        const color = this.chooseFontColor(col);
        this.drawTitle(ctx, this.getTitle(col), color);
        this.drawSymbol(ctx, col, this.settings.cellWidth);

        return tempCanvas;
      }
    }
    return undefined;
  }
  private chooseFontColor(column: number): string {
    const customColor = this.gridData.getHeaderFontColor(column);
    if (customColor) {
      return customColor;
    }
    const status = this.gridData.columnStatus(column);
    if (status === HeaderCellTypeEnum.Warning) {
      return this.gridColors.warningColor;
    }
    return this.gridColors.headerForeGroundColor;
  }

  private drawSymbol(
    ctx: CanvasRenderingContext2D,
    column: number,
    width: number
  ) {
    const status = this.gridData.columnStatus(column);
    if (status === HeaderCellTypeEnum.Sealed) {
      this.drawLock(ctx, width);
    }
  }

  getTitle(column: number): string {
    if (this.gridData.startDate) {
      const today: Date = new Date(this.gridData.startDate);
      today.setDate(today.getDate() + column);

      return this.formatDate(today);
    }
    return '';
  }

  public drawTitle(
    ctx: CanvasRenderingContext2D,
    text: string,
    color: string = this.gridColors.headerForeGroundColor
  ): void {
    DrawHelper.drawText(
      ctx,
      text,
      0,
      0,
      this.settings.cellWidth,
      this.settings.cellHeaderHeight,
      this.gridFonts.headerFontStringZoom,
      this.gridFonts.headerFontHeightZoom,
      color,
      TextAlignmentEnum.Center,
      BaselineAlignmentEnum.Center
    );
  }

  private formatDate(date: Date): string {
    const day = date.getDate();
    const weekday = this.translateService.instant(this.gridSettings.weekday[date.getDay()]);
    const paymentInterval = this.settingsService.paymentInterval;

    if (paymentInterval === PaymentInterval.Weekly || paymentInterval === PaymentInterval.Biweekly) {
      const month = date.getMonth() + 1;
      return `${weekday} ${day}.${month.toString().padStart(2, '0')}`;
    }

    return `${weekday} ${day}. `;
  }

  private fillHeaderBackground(
    ctx: CanvasRenderingContext2D,
    width: number
  ): void {
    DrawHelper.fillRectangle(
      ctx,
      this.gridColors.controlBackGroundColor,
      new Rectangle(0, 0, width, this.settings.cellHeaderHeight)
    );
  }

  private drawBorder(
    ctx: CanvasRenderingContext2D,
    deep = 2,
    width: number
  ): void {
    DrawHelper.drawBorder(
      ctx,
      0,
      0,
      width,
      this.settings.cellHeaderHeight,
      this.gridColors.controlBackGroundColor,
      deep,
      Gradient3DBorderStyleEnum.Raised
    );
  }

  private drawLock(ctx: CanvasRenderingContext2D, width: number) {
    const lockPath = new Path2D(
      'M7,10 L7,8 C7,5.23857625 9.23857625,3 12,3 C14.7614237,3 17,5.23857625 17,8 L17,10 L18,10 C19.1045695,10 20,10.8954305 20,12 L20,18 C20,19.1045695 19.1045695,20 18,20 L6,20 C4.8954305,20 4,19.1045695 4,18 L4,12 C4,10.8954305 4.8954305,10 6,10 L7,10 Z M12,5 C10.3431458,5 9,6.34314575 9,8 L9,10 L15,10 L15,8 C15,6.34314575 13.6568542,5 12,5 Z'
    );

    ctx.save();

    const iconSize = 16 * this.settings.zoom;
    const padding = 5 * this.settings.zoom;
    const xPos = width - iconSize - padding;
    const yPos = (this.settings.cellHeaderHeight - iconSize) / 2;

    ctx.translate(xPos, yPos);
    const scale = iconSize / 24;
    ctx.scale(scale, scale);

    ctx.fillStyle = this.gridColors.headerForeGroundColor;
    ctx.fill(lockPath);

    ctx.restore();
  }
}
