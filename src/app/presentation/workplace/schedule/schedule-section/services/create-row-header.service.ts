/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service responsible for creating and rendering row header content.
 * Draws client information including name, ID, gender icon, and period hours.
 * Creates cached canvas images for performance optimization.
 *
 * @relations
 * - Used by: BaseDrawRowHeaderService
 * - Uses: GridColorService, GridFontsService for styling
 * - Uses: WorkScheduleLoaderService for period hours data
 */
import { inject, Injectable } from '@angular/core';

import { RowHeaderIconsService } from 'src/app/presentation/shared/grid/services/row-header-icons.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { Gradient3DBorderStyleEnum } from 'src/app/presentation/shared/grid/enums/gradient-3d-border-style';
import { ClientWork } from 'src/app/domain/models/schedule-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { GenderEnum } from 'src/app/domain/enums/client-enum';
import { GridRowHeader } from '../../classes/grid-row-header';
import { BaseDataService } from '../../../../shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from '../../../../shared/grid/services/data-setting/settings.service';
import { TranslateService } from '@ngx-translate/core';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';

export interface FilterIconResult {
  recFilterIcon: Rectangle;
}

@Injectable()
export class BaseCreateRowHeaderService {
  private settings = inject(BaseSettingsService);
  private gridData = inject(BaseDataService);
  private rowIcons = inject(RowHeaderIconsService);
  private gridColors = inject(GridColorService);
  private gridFonts = inject(GridFontsService);
  private translateService = inject(TranslateService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);

  private backgroundCollection = new Map<string, HTMLCanvasElement>();
  private oldWidth = 0;

  private iconWidth = this.settings.rowHeaderIconWith;
  private iconHeight = this.settings.rowHeaderIconHeight;
  private margin = 4;
  private filterIconSize = 16;

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

    const clientIndex = this.gridData.rowGroupIndex[row];
    const client = this.gridData.getGroupIndex(clientIndex) as ClientWork;

    if (client === undefined) {
      return undefined;
    }

    this.drawCell(cell, width, client, clientIndex);
    return cell;
  }

  createRowHeaderHeader(
    ctx: CanvasRenderingContext2D,
    width: number,
    filterImage?: HTMLImageElement
  ): FilterIconResult | undefined {
    ctx.fillStyle = this.gridColors.controlBackGroundColor;

    this.fillHeaderBackground(ctx, width);

    this.drawBorder(ctx, width, this.settings.cellHeaderHeight);

    const totalCount = this.workScheduleLoader.totalAvailableClients;
    const displayCount = totalCount > 0 ? totalCount : this.gridData.indexes;

    this.drawTitle(
      ctx,
      this.translateService.instant('schedule.row-header.headline') +
        ' (' +
        displayCount.toString() +
        ')',
      width
    );

    return this.drawFilterIcon(ctx, width, filterImage);
  }

  private drawFilterIcon(
    ctx: CanvasRenderingContext2D,
    width: number,
    filterImage?: HTMLImageElement
  ): FilterIconResult | undefined {
    if (!filterImage) return undefined;

    const iconMargin = 4;
    const iconX = width - this.filterIconSize - iconMargin;
    const iconY = (this.settings.cellHeaderHeight - this.filterIconSize) / 2;

    ctx.drawImage(filterImage, iconX, iconY, this.filterIconSize, this.filterIconSize);

    return {
      recFilterIcon: new Rectangle(
        iconX,
        iconY,
        iconX + this.filterIconSize,
        iconY + this.filterIconSize
      )
    };
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

    if (client.gender === GenderEnum.legalEntity && !client.company) {
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
    width: number
  ): void {
    const leftPadding = 4;
    DrawHelper.drawText(
      ctx,
      text,
      leftPadding,
      0,
      width - leftPadding,
      this.settings.cellHeaderHeight,
      this.gridFonts.headerFontStringZoom,
      this.gridFonts.headerFontHeightZoom,
      this.gridColors.headerForeGroundColor,
      TextAlignmentEnum.Left,
      BaselineAlignmentEnum.Center
    );
  }

  private drawName(
    ctx: CanvasRenderingContext2D,
    text: string,
    width: number,
    height: number,
    client?: ClientWork
  ): void {
    const sectionHeight = height / 3;
    const symbolSize = 16 * this.settings.zoom;
    const leftPadding = 4;
    const fontHeight = this.gridFonts.headerFontHeightZoom;
    const lineSpacing = 2;
    const twoLinesHeight = fontHeight * 2 + lineSpacing;
    const middleZoneStart = sectionHeight;
    const middleZoneCenter = middleZoneStart + sectionHeight / 2;
    const firstLineY = middleZoneCenter - twoLinesHeight / 2 + fontHeight / 2;
    const secondLineY = firstLineY + fontHeight + lineSpacing;

    // Zone Oben: Vertragssymbol (wenn kein Vertrag)
    if (client && !client.hasContract) {
      ctx.save();
      ctx.font = `${symbolSize}px Arial`;
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('⊘', leftPadding, sectionHeight / 2);
      ctx.restore();
    }

    // Zone Mitte - Zeile 1: ID-Number
    if (client) {
      const idNumberText = client.idNumber.toString();
      ctx.save();
      ctx.font = this.gridFonts.headerFontStringZoom;
      ctx.fillStyle = this.gridColors.headerForeGroundColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(idNumberText, leftPadding, firstLineY);
      ctx.restore();
    }

    // Zone Mitte - Zeile 2: Name mit Hintergrund
    const textWidth = this.prepareFontMeasureTextForHeader(ctx, text);
    const padding = 2;
    const idealBackgroundWidth = textWidth + padding * 2;
    const maxBackgroundWidth = width - 2;
    const backgroundWidth = Math.min(idealBackgroundWidth, maxBackgroundWidth);
    const backgroundHeight = fontHeight + padding * 2;
    const backgroundY = secondLineY - fontHeight / 2 - padding;

    ctx.save();
    ctx.fillStyle = this.gridColors.controlBackGroundColor;
    ctx.fillRect(0, backgroundY, backgroundWidth, backgroundHeight);
    ctx.restore();

    ctx.save();
    ctx.font = this.gridFonts.headerFontStringZoom;
    ctx.fillStyle = this.gridColors.headerForeGroundColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, leftPadding, secondLineY);
    ctx.restore();

    // Zone Unten: (reserviert)
  }

  private drawGenderSymbols(
    ctx: CanvasRenderingContext2D,
    text: string,
    width: number,
    height: number
  ): void {
    const sectionHeight = height / 3;
    const fontHeight = this.gridFonts.headerFontHeightZoom;
    const lineSpacing = 2;
    const twoLinesHeight = fontHeight * 2 + lineSpacing;
    const middleZoneStart = sectionHeight;
    const middleZoneCenter = middleZoneStart + sectionHeight / 2;
    const firstLineY = middleZoneCenter - twoLinesHeight / 2 + fontHeight / 2;
    const secondLineY = firstLineY + fontHeight + lineSpacing;

    ctx.save();
    ctx.font = this.gridFonts.headerFontStringZoom;
    ctx.fillStyle = this.gridColors.headerForeGroundColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width, secondLineY);
    ctx.restore();
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

      if (value.gender === GenderEnum.legalEntity) {
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
    deep = 2
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
    height: number,
    clientIndex: number
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

    const addHoursRect = new Rectangle(
      widthWithoutInfoSpot,
      this.settings.cellHeaderHeight * 2 + this.settings.borderWidth * 2,
      width,
      this.settings.cellHeaderHeight * 3 + this.settings.borderWidth
    );

    const emptyRect = new Rectangle(
      widthWithoutInfoSpot,
      this.settings.cellHeaderHeight * 3 + this.settings.borderWidth * 3,
      width,
      height
    );

    const InfoBackColor = this.gridColors.backGroundColor;
    const emptyBackColor = this.gridColors.toolTipBackGroundColor;

    this.drawInfoSpot(
      ctx,
      this.gridData.getRowHeaderSlot1Text(clientIndex),
      scheduledHoursRect,
      InfoBackColor,
      Gradient3DBorderStyleEnum.Raised
    );
    this.drawInfoSpot(
      ctx,
      this.gridData.getRowHeaderSlot2Text(clientIndex),
      workedHoursRect,
      InfoBackColor,
      Gradient3DBorderStyleEnum.Raised
    );
    this.drawInfoSpot(
      ctx,
      this.gridData.getRowHeaderSlot3Text(clientIndex),
      addHoursRect,
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
      style
    );

    if (info && info.trim() !== '') {
      DrawHelper.drawText(
        ctx,
        info,
        rect.left,
        rect.top,
        rect.width,
        rect.height,
        this.gridFonts.headerFontStringZoom,
        this.gridFonts.headerFontHeightZoom,
        this.gridColors.headerForeGroundColor,
        TextAlignmentEnum.Center,
        BaselineAlignmentEnum.Center
      );
    }
  }

  private shouldClearBackground(width: number): boolean {
    return this.oldWidth !== width;
  }

  private isDataValid(row: number): boolean {
    return this.gridData.rows >= row;
  }

  private calculateRowProperties(cell: GridRowHeader, row: number): void {
    const index: number = this.gridData.rowGroupIndex[row];
    cell.firstRow = this.gridData.indexGroupRow[index];
    const client = this.gridData.getGroupIndex(index) as ClientWork;
    const neededRows = client?.neededRows ?? 0;
    cell.lastRow = cell.firstRow + neededRows - 1;
  }

  private drawCell(
    cell: GridRowHeader,
    width: number,
    client: ClientWork,
    clientIndex: number
  ): void {
    const tempCanvas = document.createElement('canvas');
    const neededRows = client.neededRows;
    const height = this.settings.getGroupLineHeight(neededRows);

    if (tempCanvas) {
      const ctx = DrawHelper.createHiDPICanvas(tempCanvas, width, height, true);
      if (ctx) {
        this.FillHeaderBackground(ctx, width, height);
        this.drawBorder(
          ctx,
          width - this.settings.InfoSpotWidth - this.settings.increaseBorder,
          height,
          this.settings.headerBorderWidth
        );

        const textAreaWidth = width - this.settings.InfoSpotWidth;

        this.drawGenderSymbols(
          ctx,
          this.getGenderSymbols(client),
          textAreaWidth - 5,
          height
        );

        const name = this.getName(client);
        this.drawName(ctx, name, textAreaWidth, height, client);

        this.drawInfoSpots(
          ctx,
          client,
          width - this.settings.increaseBorder,
          height,
          clientIndex
        );

        //const widthWithoutInfoSpot = width - this.settings.InfoSpotWidth;
        // this.drawIcon(ctx, client, widthWithoutInfoSpot, tempCanvas.height);

        cell.img = tempCanvas;
      }
    }
  }

  private prepareFontMeasureTextForHeader(
    ctx: CanvasRenderingContext2D,
    text: string
  ): number {
    ctx.save();
    ctx.font = this.gridFonts.headerFontStringZoom;
    const textSize = ctx.measureText(text).width;
    ctx.restore();
    return textSize;
  }
}
