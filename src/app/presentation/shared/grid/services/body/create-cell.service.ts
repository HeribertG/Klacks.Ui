// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { WeekDaysEnum } from 'src/app/presentation/shared/grid/enums/divers';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { CellBadge, DEFAULT_BADGE_HEIGHT, DEFAULT_BADGE_PADDING } from 'src/app/presentation/shared/grid/classes/cell-badge';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import {
  BaselineAlignmentEnum,
  IconCornerEnum,
  TextAlignmentEnum,
} from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { CellIconsService } from './cell-icons.service';

@Injectable()
export class BaseCreateCellService {
  protected settings = inject(BaseSettingsService);
  protected gridData = inject(BaseDataService);
  protected gridColors = inject(GridColorService);
  protected gridFonts = inject(GridFontsService);
  protected cellIcons = inject(CellIconsService);

  private emptyCellList: HTMLCanvasElement[] = new Array(20);
  private readonly lastLine = 5;
  private readonly margin = 2;
  private readonly iconMargin = 3;

  constructor() {}

  reset() {
    this.init();
  }

  private init() {
    const width = this.settings.cellWidth + this.settings.increaseBorder;
    const height = this.settings.cellHeight + this.settings.increaseBorder;

    Object.values(WeekDaysEnum).forEach((day) => {
      this.emptyCellList[day as WeekDaysEnum] = this.createAndConfigureCanvas(
        day as WeekDaysEnum,
        width,
        height,
        false,
        false
      );
      this.emptyCellList[(day as WeekDaysEnum) + this.lastLine] =
        this.createAndConfigureCanvas(
          day as WeekDaysEnum,
          width,
          height,
          true,
          false
        );
      this.emptyCellList[(day as WeekDaysEnum) + 10] =
        this.createAndConfigureCanvas(
          day as WeekDaysEnum,
          width,
          height,
          false,
          true
        );
      this.emptyCellList[(day as WeekDaysEnum) + 10 + this.lastLine] =
        this.createAndConfigureCanvas(
          day as WeekDaysEnum,
          width,
          height,
          true,
          true
        );
    });
  }

  private createAndConfigureCanvas(
    day: WeekDaysEnum,
    width: number,
    height: number,
    isLast: boolean,
    isOverlay = false
  ): HTMLCanvasElement {
    const backGroundColor = this.getBackgroundColorForDay(day, isOverlay);
    return this.createEmptyCanvas(backGroundColor, width, height, isLast);
  }

  private getBackgroundColorForDay(
    day: WeekDaysEnum,
    isOverlay = false
  ): string {
    let baseColor: string;

    switch (day) {
      case WeekDaysEnum.Workday:
        baseColor = this.gridColors.backGroundColor;
        break;
      case WeekDaysEnum.Saturday:
        baseColor = this.gridColors.backGroundColorSaturday;
        break;
      case WeekDaysEnum.Sunday:
        baseColor = this.gridColors.backGroundColorSunday;
        break;
      case WeekDaysEnum.Holiday:
        baseColor = this.gridColors.backGroundColorHolyday;
        break;
      case WeekDaysEnum.OfficiallyHoliday:
        baseColor = this.gridColors.backGroundColorOfficiallyHoliday;
        break;
      default:
        baseColor = this.gridColors.backGroundColor;
        break;
    }

    if (isOverlay) {
      return DrawHelper.GetDarkColor(baseColor, 30);
    }

    return baseColor;
  }

  private createEmptyCanvas(
    backGroundColor: string,
    width: number,
    height: number,
    isLast = false
  ): HTMLCanvasElement {
    const tempCanvas: HTMLCanvasElement = document.createElement('canvas');
    DrawHelper.createHiDPICanvas(tempCanvas, width, height, true);

    const ctx = tempCanvas.getContext('2d');
    if (ctx) {
      this.fillEmptyCell(ctx, backGroundColor, width, height, isLast);
    }

    return tempCanvas;
  }

  private fillEmptyCell(
    ctx: CanvasRenderingContext2D,
    backGroundColor: string,
    width: number,
    height: number,
    isLast = false
  ): void {
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = backGroundColor;

    ctx.fillRect(0, 0, width, height);
    this.drawSimpleBorder(ctx);

    if (isLast) {
      const h = height / DrawHelper.pixelRatio();
      const w = width / DrawHelper.pixelRatio();
      ctx.lineWidth = this.settings.boundaryBorderWidth;
      ctx.strokeStyle = this.gridColors.boundaryBorderColor;
      ctx.moveTo(0, h);
      ctx.lineTo(w, h);

      ctx.stroke();
    }

    ctx.restore();
  }

  createCell(row: number, col: number): HTMLCanvasElement | undefined {
    if (!this.isPositionValid(row, col)) {
      return;
    }

    const tempCanvas = this.initializeTempCanvas();
    if (!tempCanvas) return undefined;

    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return tempCanvas;

    const gridCell: GridCell = this.gridData.getCell(row, col);
    const weekDay = this.gridData.getWeekday(col);
    const isOverlay = this.gridData.isOverlayDay(col);
    const isHighlighted = this.gridData.isCellHighlighted(row, col);
    const lastRowFlag = this.gridData.isLastGroupRow(row) ? this.lastLine : 0;
    const needsBaseDarkening = isOverlay || isHighlighted || gridCell.sealed;
    const canvas = this.getCellCanvas(weekDay, lastRowFlag, needsBaseDarkening);

    this.drawImage(ctx, canvas);

    const needsDoubleDarkening = isOverlay && gridCell.sealed;
    if (needsDoubleDarkening && !gridCell.backgroundColor) {
      this.drawSealedOverlay(ctx);
    }

    if (gridCell.backgroundColor) {
      let bgColor = gridCell.backgroundColor;
      if (gridCell.sealed) {
        bgColor = DrawHelper.GetDarkColor(bgColor, 30);
      }
      if (isOverlay && gridCell.sealed) {
        bgColor = DrawHelper.GetDarkColor(bgColor, 30);
      }
      this.drawBackgroundColor(ctx, bgColor);
    }

    this.drawCellTexts(ctx, gridCell);

    return tempCanvas;
  }

  private drawBackgroundColor(ctx: CanvasRenderingContext2D, color: string): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(1, 1, this.settings.cellWidth - 2, this.settings.cellHeight - 2);
    ctx.restore();
  }

  private drawSealedOverlay(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(1, 1, this.settings.cellWidth - 2, this.settings.cellHeight - 2);
    ctx.restore();
  }

  initializeTempCanvas(): HTMLCanvasElement | undefined {
    const tempCanvas = document.createElement('canvas') as HTMLCanvasElement;
    DrawHelper.createHiDPICanvas(
      tempCanvas,
      this.settings.cellWidth,
      this.settings.cellHeight,
      true
    );
    return tempCanvas;
  }

  getCellCanvas(
    weekDay: number,
    lastRow: number,
    isOverlay = false
  ): HTMLCanvasElement {
    const overlayOffset = isOverlay ? 10 : 0;
    let img = this.emptyCellList[weekDay + lastRow + overlayOffset];
    if (img === undefined) {
      this.init();
      img = this.emptyCellList[weekDay + lastRow + overlayOffset];
    }
    return img;
  }

  drawImage(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement): void {
    ctx.drawImage(img, 0, 0);
  }

  drawCellTexts(ctx: CanvasRenderingContext2D, gridCell: GridCell): void {
    const fontColor = gridCell.fontColor;
    if (gridCell.mainText) {
      this.drawMainText(ctx, gridCell.mainText, fontColor);
    }
    if (gridCell.firstSubText) {
      this.drawFirstSubText(ctx, gridCell.firstSubText, fontColor);
    }
    if (gridCell.secondSubText) {
      this.drawSecondSubText(ctx, gridCell.secondSubText, fontColor);
    }
    if (gridCell.icons) {
      this.drawIcons(ctx, gridCell);
    }
    if (gridCell.badges) {
      this.drawBadges(ctx, gridCell);
    }
  }

  private drawBadges(ctx: CanvasRenderingContext2D, gridCell: GridCell): void {
    if (!gridCell.badges) return;

    for (const badge of gridCell.badges) {
      this.drawBadge(ctx, badge);
    }
  }

  private drawBadge(ctx: CanvasRenderingContext2D, badge: CellBadge): void {
    const zoom = this.settings.zoom;
    const fontSize = (DEFAULT_BADGE_HEIGHT - 2) * zoom;
    ctx.font = `${fontSize}px Arial`;
    const textWidth = ctx.measureText(badge.text).width;
    const badgeWidth = textWidth + DEFAULT_BADGE_PADDING * 2 * zoom;
    const badgeHeight = (DEFAULT_BADGE_HEIGHT + 2) * zoom;
    const borderRadius = badgeHeight / 2;

    const position = this.calculateBadgePosition(badge.corner, badgeWidth, badgeHeight);

    ctx.fillStyle = badge.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(position.x, position.y, badgeWidth, badgeHeight, borderRadius);
    ctx.fill();

    ctx.fillStyle = badge.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge.text, position.x + badgeWidth / 2, position.y + badgeHeight / 2);
  }

  private calculateBadgePosition(
    corner: IconCornerEnum,
    width: number,
    height: number
  ): { x: number; y: number } {
    const cellWidth = this.settings.cellWidth;
    const cellHeight = this.settings.cellHeight;
    const margin = this.iconMargin * this.settings.zoom;

    switch (corner) {
      case IconCornerEnum.TopLeft:
        return { x: margin, y: margin };
      case IconCornerEnum.TopRight:
        return { x: cellWidth - width - margin, y: margin };
      case IconCornerEnum.BottomLeft:
        return { x: margin, y: cellHeight - height - margin };
      case IconCornerEnum.BottomRight:
        return { x: cellWidth - width - margin, y: cellHeight - height - margin };
      default:
        return { x: margin, y: margin };
    }
  }

  private drawIcons(ctx: CanvasRenderingContext2D, gridCell: GridCell): void {
    if (!gridCell.icons) return;

    const zoom = this.settings.zoom;
    for (const cellIcon of gridCell.icons) {
      const zoomedSize = cellIcon.size * zoom;
      const iconCanvas = this.cellIcons.getIcon(cellIcon.svgIcon, zoomedSize);
      if (!iconCanvas) continue;

      const position = this.calculateIconPosition(cellIcon.corner, zoomedSize);
      ctx.drawImage(iconCanvas, position.x, position.y, zoomedSize, zoomedSize);
    }
  }

  private calculateIconPosition(
    corner: IconCornerEnum,
    size: number
  ): { x: number; y: number } {
    const cellWidth = this.settings.cellWidth;
    const cellHeight = this.settings.cellHeight;
    const margin = this.iconMargin * this.settings.zoom;

    switch (corner) {
      case IconCornerEnum.TopLeft:
        return { x: margin, y: margin };
      case IconCornerEnum.TopRight:
        return { x: cellWidth - size - margin, y: margin };
      case IconCornerEnum.BottomLeft:
        return { x: margin, y: cellHeight - size - margin };
      case IconCornerEnum.BottomRight:
        return { x: cellWidth - size - margin, y: cellHeight - size - margin };
      default:
        return { x: margin, y: margin };
    }
  }

  private drawMainText(ctx: CanvasRenderingContext2D, text: string, fontColor?: string): void {
    DrawHelper.drawText(
      ctx,
      text,
      0,
      this.margin * this.settings.zoom + this.settings.increaseBorder * 2,
      this.settings.cellWidth,
      this.gridFonts.mainFontHeightZoom,
      this.gridFonts.mainFontStringZoom,
      +this.gridFonts.mainFontSizeZoom,
      fontColor || this.gridColors.mainFontColor,
      TextAlignmentEnum.Center,
      BaselineAlignmentEnum.Center
    );
  }

  private drawFirstSubText(ctx: CanvasRenderingContext2D, text: string, fontColor?: string): void {
    DrawHelper.drawText(
      ctx,
      text,
      0,
      this.margin * this.settings.zoom +
        this.gridFonts.mainFontHeightZoom +
        this.settings.increaseBorder * 2,
      this.settings.cellWidth,
      this.gridFonts.firstSubFontHeightZoom,
      this.gridFonts.firstSubFontStringZoom,
      +this.gridFonts.firstSubFontSizeZoom,
      fontColor || this.gridColors.subFontColor,
      TextAlignmentEnum.Center,
      BaselineAlignmentEnum.Center
    );
  }

  private drawSecondSubText(ctx: CanvasRenderingContext2D, text: string, fontColor?: string): void {
    DrawHelper.drawText(
      ctx,
      text,
      0,
      this.margin * this.settings.zoom +
        this.gridFonts.mainFontHeightZoom +
        this.gridFonts.firstSubFontHeightZoom +
        this.settings.increaseBorder * 4,
      this.settings.cellWidth,
      this.gridFonts.secondSubFontHeightZoom,
      this.gridFonts.secondSubFontStringZoom,
      +this.gridFonts.secondSubFontSizeZoom,
      fontColor || this.gridColors.subFontColor,
      TextAlignmentEnum.Center,
      BaselineAlignmentEnum.Center
    );
  }

  drawSimpleBorder(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = this.gridColors.borderColor;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(
      0,
      0,
      this.settings.cellWidth + this.settings.increaseBorder,
      this.settings.cellHeight + this.settings.increaseBorder
    );
  }

  private isPositionValid(row: number, col: number) {
    if (row < this.gridData.rows && col < this.gridData.columns) {
      return true;
    }
    return false;
  }
}
