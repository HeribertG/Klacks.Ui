// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for managing tooltip display in the schedule row header.
 * @param tooltipService - Global tooltip service for show/hide
 * @param translateService - Translation service for tooltip texts
 * @param dataService - Grid data (rows, groups, clients)
 * @param settings - Grid settings (cell height, header height, zoom)
 * @param scroll - Scroll position of the grid
 * @param scheduleChangeService - Dirty state tracking for clients
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TooltipService } from 'src/app/presentation/shared/tooltip/tooltip.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { ScheduleChangeService } from 'src/app/domain/services/schedule/schedule-change.service';
import { IClientWork } from 'src/app/domain/models/schedule/schedule-class';
import { IScheduleQualification } from 'src/app/domain/models/schedule/work-schedule-class';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { computeQualificationBubbleLayout } from '../services/qualification-bubble-layout';

@Injectable()
export class RowHeaderTooltipService {
  private translateService = inject(TranslateService);
  private tooltipService = inject(TooltipService);
  private dataService = inject(BaseDataService);
  private settings = inject(BaseSettingsService);
  private scroll = inject(ScrollService);
  private scheduleChangeService = inject(ScheduleChangeService);

  hide(): void {
    this.tooltipService.hide();
  }

  checkContractSymbolTooltip(
    event: MouseEvent,
    pos: { x: number; y: number },
    canvas: HTMLCanvasElement | undefined,
  ): boolean {
    if (!canvas) return false;

    const row =
      Math.floor(
        (pos.y - this.settings.cellHeaderHeight) / this.settings.cellHeight,
      ) + this.scroll.verticalScrollPosition;
    if (row < 0 || row >= this.dataService.rows) return false;

    const clientIndex = this.dataService.rowGroupIndex[row];
    if (clientIndex === undefined) return false;

    const client = this.dataService.getGroupIndex(clientIndex);
    if (!client || client.hasContract) return false;

    const firstRow = this.dataService.indexGroupRow[clientIndex];
    const cellHeight = this.settings.cellHeight;
    const localY =
      pos.y -
      this.settings.cellHeaderHeight -
      (firstRow - this.scroll.verticalScrollPosition) * cellHeight;
    const sectionHeight = cellHeight / 3;

    if (localY >= 0 && localY <= sectionHeight && pos.x >= 0 && pos.x <= 24) {
      const tooltipText = this.translateService.instant(
        'schedule.row-header.no-contract.tooltip',
      );
      this.tooltipService.show({
        text: tooltipText,
        x: event.clientX,
        y: event.clientY,
      });
      return true;
    }

    return false;
  }

  checkDirtyDotTooltip(
    event: MouseEvent,
    pos: { x: number; y: number },
    canvas: HTMLCanvasElement | undefined,
  ): boolean {
    if (!canvas) return false;

    const row =
      Math.floor(
        (pos.y - this.settings.cellHeaderHeight) / this.settings.cellHeight,
      ) + this.scroll.verticalScrollPosition;
    if (row < 0 || row >= this.dataService.rows) return false;

    const clientIndex = this.dataService.rowGroupIndex[row];
    if (clientIndex === undefined) return false;

    const client = this.dataService.getGroupIndex(clientIndex);
    if (!client || !this.scheduleChangeService.isDirty(client.id)) return false;

    const firstRow = this.dataService.indexGroupRow[clientIndex];
    const localY =
      pos.y -
      this.settings.cellHeaderHeight -
      (firstRow - this.scroll.verticalScrollPosition) *
        this.settings.cellHeight;
    const sectionHeight = this.settings.cellHeight / 3;

    const isRtlDot = document.documentElement.dir === 'rtl';
    const textAreaWidth =
      canvas.getBoundingClientRect().width - this.settings.InfoSpotWidth;
    const dotRadius = 4.5 * this.settings.zoom;
    const dotX = isRtlDot ? dotRadius + 4 : textAreaWidth - dotRadius - 4;
    const dotY = dotRadius + 2;
    const hitRadius = dotRadius + 4;

    if (
      localY >= 0 &&
      localY <= sectionHeight &&
      Math.abs(pos.x - dotX) <= hitRadius &&
      Math.abs(localY - dotY) <= hitRadius
    ) {
      const tooltipText = this.translateService.instant(
        'schedule.row-header.dirty.tooltip',
      );
      this.tooltipService.show({
        text: tooltipText,
        x: event.clientX,
        y: event.clientY,
      });
      return true;
    }

    return false;
  }

  checkQualificationTooltip(
    event: MouseEvent,
    pos: { x: number; y: number },
    canvas: HTMLCanvasElement | undefined,
  ): boolean {
    if (!canvas) return false;

    const row =
      Math.floor(
        (pos.y - this.settings.cellHeaderHeight) / this.settings.cellHeight,
      ) + this.scroll.verticalScrollPosition;
    if (row < 0 || row >= this.dataService.rows) return false;

    const clientIndex = this.dataService.rowGroupIndex[row];
    if (clientIndex === undefined) return false;

    const client = this.dataService.getGroupIndex(clientIndex) as IClientWork | undefined;
    const qualifications = client?.qualifications ?? [];
    if (!client || qualifications.length === 0) return false;

    const firstRow = this.dataService.indexGroupRow[clientIndex];
    const lastRow = firstRow + (client.displayRows ?? 1) - 1;
    if (row < firstRow || row > lastRow) return false;

    const fullHeight = this.settings.getGroupLineHeight(client.displayRows);
    const localY =
      pos.y -
      this.settings.cellHeaderHeight -
      (firstRow - this.scroll.verticalScrollPosition) * this.settings.cellHeight;

    const isRtl = document.documentElement.dir === 'rtl';
    const layout = computeQualificationBubbleLayout({
      qualifications,
      cellWidth: canvas.getBoundingClientRect().width,
      cellHeight: fullHeight,
      zoom: this.settings.zoom,
      isRtl,
      infoSpotWidth: this.settings.InfoSpotWidth,
      iconWidth: this.settings.rowHeaderIconWith,
    });
    if (layout.bubbles.length === 0) return false;

    const hitRadius = layout.diameter / 2 + 2;
    const hovered = layout.bubbles.find(
      (b) => Math.hypot(pos.x - b.cx, localY - b.cy) <= hitRadius,
    );
    if (!hovered) return false;

    const tooltipText =
      hovered.overflowCount > 0
        ? this.buildOverflowTooltip(qualifications, layout.bubbles)
        : this.buildQualificationLabel(hovered.qualification);
    if (!tooltipText) return false;

    this.tooltipService.show({
      text: tooltipText,
      x: event.clientX,
      y: event.clientY,
    });
    return true;
  }

  private buildQualificationLabel(
    qualification: IScheduleQualification | null,
  ): string {
    if (!qualification) return '';
    const lang = this.translateService.currentLang ?? 'de';
    const name = getLocalizedValue(qualification.name, lang);
    const emoji = qualification.emoji ?? '';
    return emoji ? `${emoji} ${name}` : name;
  }

  private buildOverflowTooltip(
    qualifications: IScheduleQualification[],
    bubbles: { qualification: IScheduleQualification | null }[],
  ): string {
    const shownIds = new Set(
      bubbles
        .map((b) => b.qualification?.qualificationId)
        .filter((id): id is string => !!id),
    );
    const hidden = qualifications.filter(
      (q) => !!q.emoji && q.emoji.trim() !== '' && !shownIds.has(q.qualificationId),
    );
    return hidden.map((q) => this.buildQualificationLabel(q)).join('\n');
  }

  checkInfoSpotTooltip(
    event: MouseEvent,
    pos: { x: number; y: number },
    canvas: HTMLCanvasElement | undefined,
  ): void {
    if (!canvas) {
      this.tooltipService.hide();
      return;
    }

    const row =
      Math.floor(
        (pos.y - this.settings.cellHeaderHeight) / this.settings.cellHeight,
      ) + this.scroll.verticalScrollPosition;

    if (row < 0 || row >= this.dataService.rows) {
      this.tooltipService.hide();
      return;
    }

    const clientIndex = this.dataService.rowGroupIndex[row];
    if (clientIndex === undefined) {
      this.tooltipService.hide();
      return;
    }

    const firstRow = this.dataService.indexGroupRow[clientIndex];
    const client = this.dataService.getGroupIndex(clientIndex);
    const lastRow = firstRow + (client?.displayRows ?? 1) - 1;

    if (row < firstRow || row > lastRow) {
      this.tooltipService.hide();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const visualWidth = rect.width;
    const canvasWidth = canvas.width;
    const scale = canvasWidth / visualWidth;

    const isRtl = document.documentElement.dir === 'rtl';
    const infoSpotVisualWidth = this.settings.InfoSpotWidth / scale;

    if (isRtl ? pos.x > infoSpotVisualWidth : pos.x < visualWidth - infoSpotVisualWidth) {
      this.tooltipService.hide();
      return;
    }

    const localY =
      pos.y -
      this.settings.cellHeaderHeight -
      (firstRow - this.scroll.verticalScrollPosition) *
        this.settings.cellHeight;

    const slot1Top = this.settings.increaseBorder;
    const slot1Bottom = this.settings.cellHeaderHeight;
    const slot2Top = this.settings.cellHeaderHeight + this.settings.borderWidth;
    const slot2Bottom =
      this.settings.cellHeaderHeight * 2 + this.settings.borderWidth;
    const slot3Top =
      this.settings.cellHeaderHeight * 2 + this.settings.borderWidth * 2;
    const slot3Bottom =
      this.settings.cellHeaderHeight * 3 + this.settings.borderWidth * 2;

    let tooltipKey = '';

    if (localY >= slot1Top && localY <= slot1Bottom) {
      tooltipKey = 'schedule.row-header.slot1.tooltip';
    } else if (localY >= slot2Top && localY <= slot2Bottom) {
      tooltipKey = 'schedule.row-header.slot2.tooltip';
    } else if (localY >= slot3Top && localY <= slot3Bottom) {
      tooltipKey = 'schedule.row-header.slot3.tooltip';
    }

    if (tooltipKey) {
      const tooltipText = this.translateService.instant(tooltipKey);
      this.tooltipService.show({
        text: tooltipText,
        x: event.clientX,
        y: event.clientY,
      });
    } else {
      this.tooltipService.hide();
    }
  }
}
