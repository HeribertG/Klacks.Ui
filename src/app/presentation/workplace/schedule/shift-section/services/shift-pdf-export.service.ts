import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { WeekDay } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { SchedulePdfDrawingService, ScheduleDrawingConfig } from '../../schedule-section/services/schedule-pdf-drawing.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { addDays, compareDate } from 'src/app/shared/helpers/date.helper';
import { transformNumberToOwnTime } from 'src/app/domain/helpers/own-time.helper';
import { WeekDaysEnum } from 'src/app/presentation/shared/grid/enums/divers';

interface ShiftCellData {
  mainText: string;
  backgroundColor?: string;
  fontColor?: string;
  isEmpty: boolean;
  highlighted: boolean;
}

interface DayCapacity {
  engaged: number;
  sumEmployees: number;
  quantity: number;
}

interface ShiftBlock {
  name: string;
  slot1: string;
  slot2: string;
  slot3: string;
  cells: ShiftCellData[];
}

interface ShiftRowData {
  shiftId: string;
  shiftName: string;
  abbreviation: string;
  startShift: string;
  endShift: string;
  workTime: number;
  activeDays: Map<string, DayCapacity>;
}

@Injectable()
export class ShiftPdfExportService {
  private translateService = inject(TranslateService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private appSettingsService = inject(AppSettingsManagementService);
  private gridColorService = inject(GridColorService);
  private gridSettingsService = inject(GridSettingsService);
  private drawingService = inject(SchedulePdfDrawingService);
  private groupSelectionService = inject(GroupSelectionService);
  private holidayCollection = inject(HolidayCollectionService);

  private readonly A4_LANDSCAPE = {
    width: 841.89,
    height: 595.28,
  };

  private readonly MARGINS = {
    top: 40,
    left: 20,
    right: 20,
    bottom: 20,
  };

  private readonly HEADER_OFFSET = 50;
  private readonly FONT_FAMILY = 'helvetica';
  private readonly FONT_SIZE_TITLE = 14;
  private readonly FONT_SIZE_NORMAL = 9;
  private readonly SHIFT_SUB_ROW_HEIGHT = 18;

  exportShiftSchedule(): void {
    const shiftSchedules = this.dataManagementSchedule.shiftSchedules;

    if (!shiftSchedules || shiftSchedules.length === 0) {
      return;
    }

    const visibleStart = this.dataManagementSchedule.visibleStartDate;
    const visibleEnd = this.dataManagementSchedule.visibleEndDate;

    if (!visibleStart || !visibleEnd) {
      return;
    }

    const totalColumns = Math.ceil(
      (visibleEnd.getTime() - visibleStart.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;

    const workSettings = this.appSettingsService.workSettings();
    const daysBefore = workSettings.dayVisibleBefore;
    const daysAfter = workSettings.dayVisibleAfter;

    const coreStartCol = daysBefore;
    const coreEndCol = totalColumns - daysAfter - 1;
    const coreDays = coreEndCol - coreStartCol + 1;

    if (coreDays <= 0) {
      return;
    }

    const config = this.drawingService.createDefaultConfig();
    config.subRowHeight = this.SHIFT_SUB_ROW_HEIGHT;

    const days = this.buildDayHeaders(visibleStart, coreStartCol, coreDays);
    const shiftRows = this.buildShiftRows(shiftSchedules);
    const shiftBlocks = this.buildShiftBlocks(shiftRows, visibleStart, coreStartCol, coreDays);

    if (shiftBlocks.length === 0) {
      return;
    }

    const availableWidth = this.A4_LANDSCAPE.width - this.MARGINS.left - this.MARGINS.right;
    const colWidth = (availableWidth - config.rowHeaderWidth) / coreDays;
    const contentStartY = this.MARGINS.top + this.HEADER_OFFSET;

    const pages = this.paginate(shiftBlocks, contentStartY, config);

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    });

    const title = this.buildTitle();
    const totalPages = pages.length;

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      if (pageIdx > 0) {
        pdf.addPage();
      }

      this.addPageHeader(pdf, title, pageIdx + 1, totalPages);

      let currentY = contentStartY;

      this.drawingService.drawColumnHeaders(
        pdf,
        this.MARGINS.left,
        currentY,
        config,
        days,
        colWidth,
      );

      currentY += config.columnHeaderHeight;

      const pageBlocks = pages[pageIdx];

      for (let blockIdx = 0; blockIdx < pageBlocks.length; blockIdx++) {
        const block = pageBlocks[blockIdx];
        const blockHeight = config.subRowHeight;

        this.drawingService.drawRowHeader(
          pdf,
          this.MARGINS.left,
          currentY,
          config,
          blockHeight,
          block.name,
          block.slot1,
          block.slot2,
          block.slot3,
        );

        const scheduleX = this.MARGINS.left + config.rowHeaderWidth;

        for (let col = 0; col < coreDays; col++) {
          const cellData = block.cells[col];
          const cellX = scheduleX + col * colWidth;
          const weekdayType = days[col].weekdayType;

          if (cellData?.highlighted) {
            const baseBg = this.getWeekdayBackgroundColor(weekdayType);
            const darkened = this.drawingService.darkenColor(baseBg, 60);
            pdf.setFillColor(darkened);
            pdf.rect(cellX, currentY, colWidth, blockHeight, 'F');
          } else {
            this.drawingService.drawDayBackground(
              pdf, cellX, currentY, colWidth, blockHeight, weekdayType,
            );
          }
        }

        for (let col = 0; col < coreDays; col++) {
          const cellData = block.cells[col];
          if (!cellData || cellData.isEmpty) continue;

          const cellX = scheduleX + col * colWidth;
          this.drawingService.drawCellContent(
            pdf,
            cellX,
            currentY,
            colWidth,
            config.subRowHeight,
            cellData.mainText,
            '',
            '',
            cellData.backgroundColor,
            cellData.fontColor,
          );
        }

        this.drawingService.drawGridLines(
          pdf,
          scheduleX,
          currentY,
          colWidth,
          coreDays,
          blockHeight,
          config,
        );

        currentY += blockHeight;

        const isLast = blockIdx === pageBlocks.length - 1;
        this.drawingService.drawRowSeparator(
          pdf,
          this.MARGINS.left,
          currentY,
          availableWidth,
          !isLast,
        );
      }
    }

    const fileName = `shift-schedule-${new Date().getTime()}.pdf`;
    pdf.save(fileName);
  }

  private buildTitle(): string {
    const filter = this.dataManagementSchedule.workFilter;
    const workSettings = this.appSettingsService.workSettings();
    const groupName = this.groupSelectionService.selectedGroup?.name;
    const groupSuffix = groupName ? ` - ${groupName}` : '';
    const period = this.buildPeriodLabel(workSettings.paymentInterval, filter);
    return `Schichtplan - ${period} ${filter.currentYear}${groupSuffix}`;
  }

  private buildPeriodLabel(paymentInterval: number, filter: { currentMonth: number; currentWeek?: number }): string {
    switch (paymentInterval) {
      case 0:
        return `KW ${filter.currentWeek ?? 1}`;
      case 1: {
        const week = filter.currentWeek ?? 1;
        return `KW ${week}-${week + 1}`;
      }
      case 2:
      default:
        return this.gridSettingsService.monthsName[filter.currentMonth - 1];
    }
  }

  private addPageHeader(
    pdf: jsPDF,
    title: string,
    pageNumber: number,
    totalPages: number,
  ): void {
    pdf.setFontSize(this.FONT_SIZE_TITLE);
    pdf.setFont(this.FONT_FAMILY, 'bold');
    pdf.text(title, this.MARGINS.left, this.MARGINS.top);

    pdf.setFontSize(this.FONT_SIZE_NORMAL);
    pdf.setFont(this.FONT_FAMILY, 'normal');

    const generatedText = this.translateService.instant('pdf.generated');
    const pageText = this.translateService.instant('pdf.page');
    const ofText = this.translateService.instant('pdf.of');

    const dateString = `${generatedText}: ${new Date().toLocaleDateString()}`;
    const pageString = `${pageText} ${pageNumber} ${ofText} ${totalPages}`;

    pdf.text(dateString, this.MARGINS.left, this.MARGINS.top + 15);
    pdf.text(
      pageString,
      this.A4_LANDSCAPE.width - this.MARGINS.right - 80,
      this.MARGINS.top + 15,
    );
  }

  private buildDayHeaders(
    visibleStart: Date,
    coreStartCol: number,
    coreDays: number,
  ): { weekdayName: string; dayOfMonth: number; weekdayType: number }[] {
    const days: { weekdayName: string; dayOfMonth: number; weekdayType: number }[] = [];

    for (let i = 0; i < coreDays; i++) {
      const col = coreStartCol + i;
      const date = addDays(visibleStart, col);
      const weekdayName = this.gridSettingsService.weekday[date.getDay()];
      const weekdayType = this.getWeekdayType(date);

      days.push({
        weekdayName,
        dayOfMonth: date.getDate(),
        weekdayType,
      });
    }

    return days;
  }

  private getWeekdayType(date: Date): number {
    const holidays = this.holidayCollection.holidays.holidayList;
    const holiday = holidays.find((x) => compareDate(x.currentDate, date));

    if (holiday) {
      return holiday.officially
        ? WeekDaysEnum.OfficiallyHoliday
        : WeekDaysEnum.Holiday;
    }

    if (date.getDay() === WeekDay.Sunday) {
      return WeekDaysEnum.Sunday;
    } else if (date.getDay() === WeekDay.Saturday) {
      return WeekDaysEnum.Saturday;
    }

    return WeekDaysEnum.Workday;
  }

  private buildShiftRows(shiftSchedules: { shiftId: string; date: Date; shiftName: string; abbreviation: string; startShift: string; endShift: string; workTime: number; engaged: number; sumEmployees: number; quantity: number }[]): ShiftRowData[] {
    const shiftMap = new Map<string, ShiftRowData>();

    for (const schedule of shiftSchedules) {
      if (!shiftMap.has(schedule.shiftId)) {
        shiftMap.set(schedule.shiftId, {
          shiftId: schedule.shiftId,
          shiftName: schedule.shiftName,
          abbreviation: schedule.abbreviation,
          startShift: schedule.startShift,
          endShift: schedule.endShift,
          workTime: schedule.workTime,
          activeDays: new Map<string, DayCapacity>(),
        });
      }

      const shiftRow = shiftMap.get(schedule.shiftId)!;
      const dateKey = this.formatDateKey(schedule.date);
      shiftRow.activeDays.set(dateKey, {
        engaged: schedule.engaged,
        sumEmployees: schedule.sumEmployees,
        quantity: schedule.quantity,
      });
    }

    return Array.from(shiftMap.values()).sort((a, b) =>
      a.shiftName.localeCompare(b.shiftName),
    );
  }

  private buildShiftBlocks(
    shiftRows: ShiftRowData[],
    visibleStart: Date,
    coreStartCol: number,
    coreDays: number,
  ): ShiftBlock[] {
    const blocks: ShiftBlock[] = [];

    for (const row of shiftRows) {
      const workTimeFormatted = this.formatWorkTime(row.workTime);
      const name = `${row.shiftName} (${workTimeFormatted})`;

      const cells: ShiftCellData[] = [];

      for (let i = 0; i < coreDays; i++) {
        const col = coreStartCol + i;
        const date = addDays(visibleStart, col);
        const dateKey = this.formatDateKey(date);
        const dayCapacity = row.activeDays.get(dateKey);

        if (dayCapacity) {
          const maxCapacity = dayCapacity.sumEmployees * dayCapacity.quantity;
          const highlighted = dayCapacity.engaged >= maxCapacity;
          cells.push({
            mainText: row.abbreviation,
            isEmpty: false,
            highlighted,
          });
        } else {
          cells.push({
            mainText: '',
            isEmpty: true,
            highlighted: false,
          });
        }
      }

      blocks.push({
        name,
        slot1: '',
        slot2: '',
        slot3: '',
        cells,
      });
    }

    return blocks;
  }

  private paginate(
    blocks: ShiftBlock[],
    contentStartY: number,
    config: ScheduleDrawingConfig,
  ): ShiftBlock[][] {
    const availableHeight =
      this.A4_LANDSCAPE.height - this.MARGINS.bottom - contentStartY - config.columnHeaderHeight;

    const pages: ShiftBlock[][] = [];
    let currentPage: ShiftBlock[] = [];
    let usedHeight = 0;

    for (const block of blocks) {
      const blockHeight = config.subRowHeight;

      if (usedHeight + blockHeight > availableHeight && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        usedHeight = 0;
      }

      currentPage.push(block);
      usedHeight += blockHeight;
    }

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages.length > 0 ? pages : [[]];
  }

  private getWeekdayBackgroundColor(weekdayType: number): string {
    switch (weekdayType) {
      case WeekDaysEnum.Saturday:
        return this.gridColorService.backGroundColorSaturday;
      case WeekDaysEnum.Sunday:
        return this.gridColorService.backGroundColorSunday;
      case WeekDaysEnum.Holiday:
        return this.gridColorService.backGroundColorHolyday;
      case WeekDaysEnum.OfficiallyHoliday:
        return this.gridColorService.backGroundColorOfficiallyHoliday;
      default:
        return '#ffffff';
    }
  }

  private formatWorkTime(workTime: number): string {
    const ownTime = transformNumberToOwnTime(workTime, true);
    const hours = ownTime.hours.padStart(2, '0');
    const minutes = ownTime.minutes.padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private formatDateKey(date: Date | string): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
