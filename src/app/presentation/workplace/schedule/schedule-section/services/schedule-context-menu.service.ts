// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service building context menus for the schedule grid.
 * Creates different menus based on cell state (empty, work entry, work change).
 * Handles shift and absence submenus for adding new entries.
 *
 * @relations
 * - Used by: ScheduleSectionComponent
 * - Uses: MenuDataTemplate for menu item templates
 * - Uses: AbsenceMenuService for absence options
 * - Uses: DataManagementScheduleService for shift data
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  Menu,
  MenuItem,
} from 'src/app/presentation/shared/context-menu/context-menu-class';
import { MenuDataTemplate } from 'src/app/presentation/helpers/context-menu-data-template';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AbsenceMenuService } from 'src/app/domain/services/schedule/absence-menu.service';
import { AbsenceDetailMode } from 'src/app/domain/models/absence-detail/absence-detail-class';
import { IBreakPlaceholder } from 'src/app/domain/models/break/break-class';
import { IShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule-class';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { IScheduleCell, WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { ShiftType } from 'src/app/domain/models/shift/shift-class';
import { WorkLockLevelService } from 'src/app/domain/services/schedule/work-lock-level.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { IconTimeWindowComponent } from 'src/app/presentation/icons/icon-time-window.component';
import { IconBoxContainerComponent } from 'src/app/presentation/icons/icon-box-container.component';
import { IconShiftSegmentComponent } from 'src/app/presentation/icons/icon-shift-segment.component';
import { IconUnknownTimeComponent } from 'src/app/presentation/icons/icon-unknown-time.component';
import { addDays } from 'src/app/shared/helpers/date.helper';
import { ScheduleDataService } from './schedule-data.service';

export interface ContextMenuContext {
  row: number;
  column: number;
  dataService: ScheduleDataService;
  entry?: IScheduleCell | null;
}

@Injectable()
export class ScheduleContextMenuService {
  private translateService = inject(TranslateService);
  private cellManipulation = inject(BaseCellManipulationService);
  private dataManagement = inject(DataManagementScheduleService);
  private absenceMenuService = inject(AbsenceMenuService);
  private lockLevelService = inject(WorkLockLevelService);
  private authService = inject(AuthorizationService);

  createBreakPlaceholderContextMenu(bp: IBreakPlaceholder): Menu {
    const menuData = new Menu();
    menuData.list.push(...MenuDataTemplate.deleteBreakPlaceholder());
    menuData.list.push(...MenuDataTemplate.divider());

    const language = this.translateService.currentLang || DomainMessages.DEFAULT_LANG;
    const absenceItems = this.absenceMenuService.getAbsenceMenuItems(language);
    const detailItems = absenceItems.filter(item => item.absenceId === bp.absenceId && item.isDetail);

    if (detailItems.length > 0) {
      const adoptItem = new MenuItem('adoptAbsence', DomainMessages.ADOPT_ABSENCE, false);
      adoptItem.hasMenu = true;
      adoptItem.menu = new Menu();
      for (const detail of detailItems) {
        const subItem = new MenuItem('adoptAbsence', detail.name, false);
        subItem.valueKey = detail.id;
        subItem.svgIcon = this.getAbsenceSvgIcon(detail.color);
        if (detail.mode === AbsenceDetailMode.TimeRange && detail.startTime && detail.endTime) {
          subItem.subText = `(${this.formatTimeHHMM(detail.startTime)} - ${this.formatTimeHHMM(detail.endTime)})`;
        } else if (detail.mode === AbsenceDetailMode.Duration && detail.duration) {
          subItem.subText = `(${detail.duration}h)`;
        }
        adoptItem.menu.list.push(subItem);
      }
      menuData.list.push(adoptItem);
    } else {
      menuData.list.push(new MenuItem('adoptAbsence', DomainMessages.ADOPT_ABSENCE, false));
    }

    return menuData;
  }

  createContextMenu(context: ContextMenuContext): Menu {
    const menuData = new Menu();
    const hasPreResolvedEntry = context.entry !== undefined;
    const isCellFilled = hasPreResolvedEntry
      ? context.entry !== null
      : context.dataService.isCellActive(context.row, context.column);

    if (isCellFilled) {
      const entry = hasPreResolvedEntry
        ? context.entry
        : context.dataService.getWorkScheduleEntryForCell(
            context.row,
            context.column,
          );

      const isLocked = entry ? (entry.lockLevel > 0 || entry.isGroupRestricted) : false;

      if (entry?.entryType === WorkScheduleEntryType.ScheduleNote || entry?.entryType === WorkScheduleEntryType.ScheduleCommand) {
        if (!isLocked) {
          menuData.list.push(...MenuDataTemplate.edit());
          menuData.list.push(...MenuDataTemplate.divider());
          menuData.list.push(...MenuDataTemplate.delete());
        }
      } else if (entry?.entryType === WorkScheduleEntryType.WorkChange || entry?.entryType === WorkScheduleEntryType.Expenses) {
        if (!isLocked) {
          menuData.list.push(...MenuDataTemplate.edit());
          menuData.list.push(...MenuDataTemplate.divider());
          menuData.list.push(...MenuDataTemplate.delete());
        }
      } else if (isLocked) {
        if (entry?.entryType === WorkScheduleEntryType.Work || entry?.entryType === WorkScheduleEntryType.Break) {
          if (this.lockLevelService.canUnconfirm(entry, this.authService.isAdmin)) {
            menuData.list.push(...MenuDataTemplate.unconfirm());
            menuData.list.push(...MenuDataTemplate.divider());
          }
        }
        menuData.list.push(...MenuDataTemplate.showInShift());
      } else {
        menuData.list.push(...MenuDataTemplate.copyCutPaste());
        menuData.list.push(...MenuDataTemplate.divider());
        menuData.list.push(...MenuDataTemplate.delete());

        if (entry?.entryType === WorkScheduleEntryType.Work) {
          const isContainer = this.isContainerWork(entry.entryId);
          if (isContainer) {
            menuData.list.push(...MenuDataTemplate.divider());
            menuData.list.push(...MenuDataTemplate.openContainer());
          }
          menuData.list.push(...MenuDataTemplate.divider());
          menuData.list.push(...MenuDataTemplate.correction());
          menuData.list.push(...MenuDataTemplate.travel());
          menuData.list.push(...MenuDataTemplate.briefingDebriefing());
          if (isContainer) {
            menuData.list.push(...MenuDataTemplate.splitContainer());
          } else {
            menuData.list.push(...MenuDataTemplate.replacement());
          }
          menuData.list.push(...MenuDataTemplate.expenses());

          if (!this.hasWorkChanges(entry.sourceId, context.row, context.column, context.dataService)) {
            menuData.list.push(...MenuDataTemplate.editWork());
          }
        }

        if (entry?.entryType === WorkScheduleEntryType.Work || entry?.entryType === WorkScheduleEntryType.Break) {
          menuData.list.push(...MenuDataTemplate.divider());
          if (this.lockLevelService.canConfirm(entry)) {
            menuData.list.push(...MenuDataTemplate.confirm());
          }
          if (this.lockLevelService.canUnconfirm(entry, this.authService.isAdmin)) {
            menuData.list.push(...MenuDataTemplate.unconfirm());
          }
        }

        menuData.list.push(...MenuDataTemplate.divider());
        menuData.list.push(...MenuDataTemplate.showInShift());
      }
    } else if (context.dataService.isColumnSealed(context.column)) {
      return menuData;
    } else {
      menuData.list.push(...MenuDataTemplate.paste());

      const shiftsSubmenu = this.createShiftsSubmenu(
        context.column,
        context.dataService,
      );
      if (shiftsSubmenu && shiftsSubmenu.list.length > 0) {
        menuData.list.push(...MenuDataTemplate.divider());
        const dienstMenuItem = new MenuItem(
          'dienste',
          this.translateService.instant('contextMenu.shifts'),
          false,
        );
        dienstMenuItem.hasMenu = true;
        dienstMenuItem.menu = shiftsSubmenu;
        menuData.list.push(dienstMenuItem);
      }

      const absencesSubmenu = this.createAbsencesSubmenu();
      if (absencesSubmenu && absencesSubmenu.list.length > 0) {
        if (!shiftsSubmenu || shiftsSubmenu.list.length === 0) {
          menuData.list.push(...MenuDataTemplate.divider());
        }
        const absenceMenuItem = new MenuItem(
          'absenzen',
          this.translateService.instant('contextMenu.absences'),
          false,
        );
        absenceMenuItem.hasMenu = true;
        absenceMenuItem.menu = absencesSubmenu;
        menuData.list.push(absenceMenuItem);
      }
    }

    const pasteMenu = menuData.list.find((x) => x.key === 'paste');
    if (pasteMenu) {
      pasteMenu.disabled = !this.cellManipulation.hasClipboardData();
    }

    return menuData;
  }

  private createShiftsSubmenu(
    column: number,
    dataService: ScheduleDataService,
  ): Menu | undefined {
    if (!dataService.startDate) return undefined;

    const targetDate = addDays(dataService.startDate, column);
    const availableShifts = this.getAvailableShiftsForDate(targetDate);

    if (availableShifts.length === 0) return undefined;

    const seenAbbreviations = new Set<string>();
    const submenu = new Menu();

    for (const shift of availableShifts) {
      if (seenAbbreviations.has(shift.abbreviation)) continue;
      seenAbbreviations.add(shift.abbreviation);

      const startTime = this.formatTimeHHMM(shift.startShift);
      const endTime = this.formatTimeHHMM(shift.endShift);

      const menuItem = new MenuItem('shift', shift.abbreviation, false);
      menuItem.valueKey = shift.shiftId;
      menuItem.svgIcon = this.getShiftSvgIcon(shift);
      menuItem.subText = `(${startTime} - ${endTime})`;
      submenu.list.push(menuItem);
    }

    return submenu;
  }

  private createAbsencesSubmenu(): Menu | undefined {
    const language = this.translateService.currentLang || DomainMessages.DEFAULT_LANG;
    const absenceItems = this.absenceMenuService.getAbsenceMenuItems(language);

    if (absenceItems.length === 0) return undefined;

    const submenu = new Menu();

    for (const item of absenceItems) {
      const displayName =
        item.isDetail && item.name !== item.absenceName
          ? `${item.absenceName} - ${item.name}`
          : item.name;

      const menuItem = new MenuItem('absence', displayName, false);
      menuItem.valueKey = item.id;
      menuItem.svgIcon = this.getAbsenceSvgIcon(item.color);

      if (item.isDetail) {
        if (
          item.mode === AbsenceDetailMode.TimeRange &&
          item.startTime &&
          item.endTime
        ) {
          const startTime = this.formatTimeHHMM(item.startTime);
          const endTime = this.formatTimeHHMM(item.endTime);
          menuItem.subText = `(${startTime} - ${endTime})`;
        } else if (item.mode === AbsenceDetailMode.Duration && item.duration) {
          menuItem.subText = `(${item.duration}h)`;
        }
      }

      submenu.list.push(menuItem);
    }

    return submenu;
  }

  getAvailableShiftsForDate(date: Date): IShiftSchedule[] {
    const shiftSchedules = this.dataManagement.shiftSchedules;
    return shiftSchedules.filter((shift) => {
      const shiftDate = new Date(shift.date);
      const isSameDay =
        shiftDate.getFullYear() === date.getFullYear() &&
        shiftDate.getMonth() === date.getMonth() &&
        shiftDate.getDate() === date.getDate();
      const hasCapacity = shift.engaged < shift.sumEmployees * shift.quantity;
      return isSameDay && hasCapacity;
    });
  }

  private getShiftSvgIcon(shift: IShiftSchedule): string {
    const color = 'var(--standartTextColor)';
    const isContainer = shift.shiftType === 1;

    if (isContainer) {
      return IconBoxContainerComponent.getSvg(color);
    }
    if (shift.isSporadic) {
      return IconUnknownTimeComponent.getSvg(color);
    }
    if (shift.isTimeRange) {
      return IconTimeWindowComponent.getSvg(color);
    }
    return IconShiftSegmentComponent.getSvg(color);
  }

  private getAbsenceSvgIcon(color: string): string {
    const fillColor = color || 'transparent';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17 18" width="17" height="18"><rect width="17" height="18" fill="${fillColor}"/></svg>`;
  }

  formatTimeHHMM(time: string): string {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return time;
  }

  private isContainerWork(shiftId: string): boolean {
    const shift = this.dataManagement.shiftSchedules.find(
      (s) => s.shiftId === shiftId,
    );
    return shift?.shiftType === ShiftType.IsContainer;
  }

  private hasWorkChanges(
    workId: string,
    row: number,
    column: number,
    dataService: ScheduleDataService,
  ): boolean {
    const entries = dataService.getAllEntriesForClientAndColumn(row, column);
    return entries.some(
      (e) =>
        e.entryType === WorkScheduleEntryType.WorkChange &&
        e.sourceId === workId,
    );
  }
}
