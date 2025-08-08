import { inject, Injectable } from '@angular/core';
import { WeekDaysEnum } from 'src/app/presentation/shared/grid/enums/divers';
import { GridColorService } from 'src/app/presentation/shared/grid/services/grid-color.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';

@Injectable()
export class BaseCreateCellService {
  protected settings = inject(BaseSettingsService);
  protected gridData = inject(BaseDataService);
  protected gridColors = inject(GridColorService);
  protected gridFonts = inject(GridFontsService);

  private emptyCellList: HTMLCanvasElement[] = new Array(20);
  private readonly lastLine = 5;
  private readonly margin = 2;

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
    isOverlay: boolean = false
  ): HTMLCanvasElement {
    const backGroundColor = this.getBackgroundColorForDay(day, isOverlay);
    return this.createEmptyCanvas(backGroundColor, width, height, isLast);
  }

  private getBackgroundColorForDay(
    day: WeekDaysEnum,
    isOverlay: boolean = false
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
      return DrawHelper.GetDarkColor(baseColor, 25);
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
    const lastRowFlag = this.gridData.isLastGroupRow(row) ? this.lastLine : 0;
    const canvas = this.getCellCanvas(weekDay, lastRowFlag, isOverlay);

    this.drawImage(ctx, canvas);
    this.drawCellTexts(ctx, gridCell);

    return tempCanvas;
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
    isOverlay: boolean = false
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
    if (gridCell.mainText) {
      this.drawMainText(ctx, gridCell.mainText);
    }
    if (gridCell.firstSubText) {
      this.drawFirstSubText(ctx, gridCell.firstSubText);
    }
    if (gridCell.secondSubText) {
      this.drawSecondSubText(ctx, gridCell.secondSubText);
    }
  }

  private drawMainText(ctx: CanvasRenderingContext2D, text: string): void {
    DrawHelper.drawText(
      ctx,
      text,
      0,
      this.margin * this.settings.zoom + this.settings.increaseBorder * 2,
      this.settings.cellWidth,
      this.gridFonts.mainFontHeightZoom,
      this.gridFonts.mainFontStringZoom,
      +this.gridFonts.mainFontSizeZoom,
      this.gridColors.mainFontColor,
      TextAlignmentEnum.Center,
      BaselineAlignmentEnum.Center
    );
  }

  private drawFirstSubText(ctx: CanvasRenderingContext2D, text: string): void {
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
      this.gridColors.subFontColor,
      TextAlignmentEnum.Center,
      BaselineAlignmentEnum.Center
    );
  }

  private drawSecondSubText(ctx: CanvasRenderingContext2D, text: string): void {
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
      this.gridColors.subFontColor,
      TextAlignmentEnum.Left,
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
