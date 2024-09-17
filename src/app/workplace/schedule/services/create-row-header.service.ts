import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { DataService } from './data.service';
import { RowHeaderIconsService } from 'src/app/grid/services/row-header-icons.service';
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { GridFontsService } from 'src/app/grid/services/grid-fonts.service';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { GridRowHeader } from '../classes/grid-row-header';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from 'src/app/grid/enums/cell-settings.enum';
import { Gradient3DBorderStyleEnum } from 'src/app/grid/enums/gradient-3d-border-style';
import { ClientWork } from 'src/app/core/schedule-class';
import { Rectangle } from 'src/app/grid/classes/geometry';
import { GenderEnum } from 'src/app/helpers/enums/client-enum';

@Injectable()
export class CreateRowHeaderService {
  private backgroundCollection: Map<string, HTMLCanvasElement> = new Map();
  private oldWidth = 0;

  private iconWidth = this.settings.rowHeaderIconWith;
  private iconHeight = this.settings.rowHeaderIconHeight;
  private margin = 4;

  constructor(
    private settings: SettingsService,
    private gridData: DataService,
    private rowIcons: RowHeaderIconsService,
    private gridColors: GridColorService,
    private gridFonts: GridFontsService
  ) {}

  reset() {
    this.margin = 4 * this.settings.zoom;
    this.iconWidth = this.settings.rowHeaderIconWith;
    this.iconHeight = this.settings.rowHeaderIconHeight;

    this.rowIcons.reset(this.iconWidth, this.iconHeight);
  }

  createCell(row: number, width: number): GridRowHeader | undefined {
    if (this.shouldClearBackground(width)) {
      this.backgroundCollection.clear();
    }

    if (!this.isDataValid(row)) {
      return undefined;
    }

    const cell = new GridRowHeader();
    this.calculateRowProperties(cell, row);

    const client = this.gridData.getIndex(
      this.gridData.rowEmployeeIndex[row]
    ) as ClientWork;

    if (client === undefined) {
      return undefined;
    }

    this.drawCell(cell, width, client);
    return cell;
  }

  private drawIcon(
    ctx: CanvasRenderingContext2D,
    client: ClientWork,
    width: number,
    height: number
  ) {
    let tmpWidth = 0;

    if (client.gender === GenderEnum.male) {
      const malePicto = this.rowIcons.malePicto;
      if (malePicto) {
        tmpWidth += this.iconWidth + this.margin;
        const tmpHeight = height / 2 - this.iconHeight / 2 - this.margin / 2;
        ctx.drawImage(malePicto, width - tmpWidth, tmpHeight);
      }
    }
    if (client.gender === GenderEnum.female) {
      const femalePicto = this.rowIcons.femalePicto;
      if (femalePicto) {
        tmpWidth += this.iconWidth + this.margin;
        const tmpHeight = height / 2 - this.iconHeight / 2 - this.margin / 2;
        ctx.drawImage(femalePicto, width - tmpWidth, tmpHeight);
      }
    }

    if (client.gender === GenderEnum.unknown && !client.company) {
      const diversSexPicto = this.rowIcons.diversSexPicto;
      if (diversSexPicto) {
        tmpWidth += this.iconWidth + this.margin;
        const tmpHeight = height / 2 - this.iconHeight / 2 - this.margin / 2;
        ctx.drawImage(diversSexPicto, width - tmpWidth, tmpHeight);
      }
    }

    // const rowIcons1 = this.rowIcons.malePicto;
    // ctx.drawImage(rowIcons1, width - (this.iconWidth + 4), 2);
    // const rowIcons2 = this.rowIcons.femalePicto;
    // ctx.drawImage(rowIcons2, width - (this.iconWidth * 2 + 4), 2);
    // const rowIcons3 = this.rowIcons.paperClipPicto;
    // ctx.drawImage(rowIcons3, width - (this.iconWidth * 3 + 4), 2);
    // const rowIcons4 = this.rowIcons.paperPlanePicto;
    // ctx.drawImage(rowIcons4, width - (this.iconWidth * 4 + 4), 2);
    // const rowIcons5 = this.rowIcons.paperPlaneExpiredPicto;
    // ctx.drawImage(rowIcons5, width - (this.iconWidth * 5 + 4), 2);
    // const rowIcons6 = this.rowIcons.palmtreePicto;
    // ctx.drawImage(rowIcons6, width - (this.iconWidth * 6 + 4), 2);
    // const rowIcons7 = this.rowIcons.filterPicto;
    // ctx.drawImage(rowIcons7, width - (this.iconWidth * 7 + 4), 2);
    // const rowIcons8 = this.rowIcons.gearPicto;
    // ctx.drawImage(rowIcons8, width - (this.iconWidth * 8 + 4), 2);
    // const rowIcons9 = this.rowIcons.dogPicto;
    // ctx.drawImage(rowIcons9, width - (this.iconWidth * 9 + 4), 2);
    // const rowIcons10 = this.rowIcons.batonPicto;
    // ctx.drawImage(rowIcons10, width - (this.iconWidth * 10 + 4), 2);
    // const rowIcons11 = this.rowIcons.gunPicto;
    // ctx.drawImage(rowIcons11, width - (this.iconWidth * 11 + 4), 2);
    // const rowIcons12 = this.rowIcons.govermentPicto;
    // ctx.drawImage(rowIcons12, width - (this.iconWidth * 11 + 4), 2);
  }

  private drawTitle(
    ctx: CanvasRenderingContext2D,
    text: string,
    width: number,
    height: number
  ): void {
    DrawHelper.drawText(
      ctx,
      text,
      0,
      0,
      width,
      height,
      this.gridFonts.mainFontStringZoom,
      this.gridFonts.mainFontHeightZoom,
      this.gridColors.headerForeGroundColor,
      TextAlignmentEnum.Left,
      BaselineAlignmentEnum.Center
    );
  }

  private drawGenderSymbols(
    ctx: CanvasRenderingContext2D,
    text: string,
    width: number,
    height: number
  ): void {
    DrawHelper.drawText(
      ctx,
      text,
      0,
      0,
      width,
      height,
      this.gridFonts.symbolFontStringZoom,
      this.gridFonts.symbolFontHeightZoom,
      this.gridColors.headerForeGroundColor,
      TextAlignmentEnum.Right,
      BaselineAlignmentEnum.Center
    );
  }

  private getName(value: ClientWork): string {
    if (!value.legalEntity) {
      const name = value.firstName + ' ' + value.name;
      if (name) {
        return name;
      }
    } else {
      if (value.company) {
        return value.company;
      }
    }

    return 'unknown';
  }

  private getGenderSymbols(value: ClientWork): string {
    if (!value.legalEntity) {
      if (value.gender === GenderEnum.male) {
        return '\u2642';
      }

      if (value.gender === GenderEnum.female) {
        return '\u2640';
      }

      if (value.gender === GenderEnum.unknown) {
        return '\u26A5';
      }

      if (value.gender === GenderEnum.intersexuality) {
        return '\u26A5';
      }
    }

    return '';
  }

  private FillHeaderBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    DrawHelper.fillRectangle(
      ctx,
      this.gridColors.controlBackGroundColor,
      new Rectangle(0, 0, width, height)
    );
  }
  private drawBorder(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    deep: number = 2
  ) {
    DrawHelper.drawBorder(
      ctx,
      0,
      0,
      width,
      height,
      this.gridColors.controlBackGroundColor,
      deep,
      Gradient3DBorderStyleEnum.Raised
    );
  }

  private drawInfoSpots(
    ctx: CanvasRenderingContext2D,
    client: ClientWork,
    width: number,
    height: number
  ) {
    const widthWithoutInfoSpot = width - this.settings.InfoSpotWidth;

    const scheduledHoursRect = new Rectangle(
      widthWithoutInfoSpot,
      this.settings.increaseBorder,
      width,
      this.settings.cellHeaderHeight
    );
    const workedHoursRect = new Rectangle(
      widthWithoutInfoSpot,
      this.settings.cellHeaderHeight + this.settings.borderWidth,
      width,
      this.settings.cellHeaderHeight * 2 + this.settings.borderWidth
    );
    const emptyRect = new Rectangle(
      widthWithoutInfoSpot,
      this.settings.cellHeaderHeight * 2 + this.settings.borderWidth,
      width,
      height
    );

    const InfoBackColor = this.gridColors.backGroundColor;
    const emptyBackColor = this.gridColors.toolTipBackGroundColor;

    this.drawInfoSpot(
      ctx,
      '',
      scheduledHoursRect,
      InfoBackColor,
      Gradient3DBorderStyleEnum.Raised
    );
    this.drawInfoSpot(
      ctx,
      '',
      workedHoursRect,
      InfoBackColor,
      Gradient3DBorderStyleEnum.Raised
    );
    this.drawInfoSpot(
      ctx,
      '',
      emptyRect,
      emptyBackColor,
      Gradient3DBorderStyleEnum.Sunken
    );
  }

  private drawInfoSpot(
    ctx: CanvasRenderingContext2D,
    info: string,
    rect: Rectangle,
    backgroundColor: string,
    style: Gradient3DBorderStyleEnum
  ) {
    DrawHelper.fillRectangle(ctx, backgroundColor, rect);

    DrawHelper.drawBorder(
      ctx,
      rect.left,
      rect.top,
      rect.width,
      rect.height,
      backgroundColor,
      this.settings.borderWidth,
      Gradient3DBorderStyleEnum.Sunken
    );
  }

  private shouldClearBackground(width: number): boolean {
    return this.oldWidth !== width;
  }

  private isDataValid(row: number): boolean {
    return !(
      this.gridData.dataManagementSchedule.clients.length === 0 ||
      this.gridData.rowEmployeeIndex.length === 0
    );
  }

  private calculateRowProperties(cell: GridRowHeader, row: number): void {
    const index: number = this.gridData.rowEmployeeIndex[row];
    cell.firstRow = this.gridData.indexEmployeeRow[index];
    const client = this.gridData.getIndex(index) as ClientWork;
    const neededRows = client?.neededRows ?? 0;
    cell.lastRow = cell.firstRow + neededRows - 1;
  }

  private drawCell(
    cell: GridRowHeader,
    width: number,
    client: ClientWork
  ): void {
    const tempCanvas = document.createElement('canvas');
    if (tempCanvas) {
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        const neededRows = client.neededRows;
        tempCanvas.width = width;
        tempCanvas.height =
          this.settings.cellHeight * neededRows + this.settings.increaseBorder;

        this.FillHeaderBackground(ctx, width, tempCanvas.height);
        this.drawBorder(
          ctx,
          width - this.settings.InfoSpotWidth - this.settings.increaseBorder,
          tempCanvas.height,
          this.settings.headerBorderWidth
        );

        const name = this.getName(client);
        this.drawTitle(ctx, name, width, tempCanvas.height);
        const textSize =
          this.prepareFontMeasureText(ctx, name) + 25 * this.settings.zoom;
        this.drawGenderSymbols(
          ctx,
          this.getGenderSymbols(client),
          textSize,
          tempCanvas.height
        );

        this.drawInfoSpots(
          ctx,
          client,
          width - this.settings.increaseBorder,
          tempCanvas.height - this.settings.increaseBorder * 2
        );

        const widthWithoutInfoSpot = width - this.settings.InfoSpotWidth;
        // this.drawIcon(ctx, client, widthWithoutInfoSpot, tempCanvas.height);

        cell.img = tempCanvas;
      }
    }
  }

  private prepareFontMeasureText(
    ctx: CanvasRenderingContext2D,
    text: string
  ): number {
    ctx.save();
    ctx.font = this.gridFonts.mainFontStringZoom;
    const textSize = ctx.measureText(text).width;
    ctx.restore();
    return textSize;
  }
}
