// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * @copyright 2025 Heribert Gasparoli
 *
 * @description
 * Formatter for work schedule entry cells. Displays shift abbreviation,
 * time range, and applies appropriate styling including work change indicators.
 *
 * @relations
 * - Implements: ICellFormatter
 * - Uses: EmptyCellFormatterService for empty entries
 * - Used by: ScheduleDataService
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';
import { WorkLockLevelService } from 'src/app/domain/services/schedule/work-lock-level.service';
import { WorkLockLevel } from 'src/app/domain/enums/work-lock-level.enum';
import { formatTime } from 'src/app/domain/helpers/time-format.helper';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import { CellIcon } from 'src/app/presentation/shared/grid/classes/cell-icon';
import {
  WORK_APPROVED_ICON,
  WORK_CLOSED_ICON,
  WORK_CONFIRMED_ICON,
  WORK_MOVED_ICON,
} from 'src/app/presentation/shared/grid/constants/work-cell-icon.constants';
import {
  CellTypeEnum,
  IconCornerEnum,
} from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { ICellFormatter } from './cell-formatter.interface';
import { EmptyCellFormatterService } from './empty-cell-formatter.service';
import { MovedFromNoteService } from '../moved-from-note.service';

const LOCK_ICON_SIZE = 12;
const LOCK_ICONS: ReadonlyMap<number, string> = new Map([
  [WorkLockLevel.Confirmed, WORK_CONFIRMED_ICON],
  [WorkLockLevel.Approved, WORK_APPROVED_ICON],
  [WorkLockLevel.Closed, WORK_CLOSED_ICON],
]);
const TOOLTIP_SEPARATOR = ' · ';

@Injectable()
export class WorkCellFormatterService implements ICellFormatter {
  private emptyFormatter = inject(EmptyCellFormatterService);
  private lockLevelService = inject(WorkLockLevelService);
  private translateService = inject(TranslateService);
  private movedFromNote = inject(MovedFromNoteService);

  formatCell(entry: IScheduleCell | undefined): GridCell {
    if (!entry) {
      return this.emptyFormatter.formatCell(entry);
    }

    const cell = new GridCell();
    cell.cellType = CellTypeEnum.Standard;
    cell.mainText = entry.abbreviation || '';
    cell.firstSubText = this.formatWorkTime(entry.changeTime);
    cell.secondSubText =
      formatTime(entry.startTime) + ' - ' + formatTime(entry.endTime);

    const icons: CellIcon[] = [];
    const lockIcon = LOCK_ICONS.get(entry.lockLevel);
    if (lockIcon) {
      icons.push(new CellIcon(lockIcon, IconCornerEnum.TopRight, LOCK_ICON_SIZE));
    }
    if (entry.movedFromClientId) {
      icons.push(new CellIcon(WORK_MOVED_ICON, IconCornerEnum.TopLeft, LOCK_ICON_SIZE));
    }
    if (icons.length > 0) {
      cell.icons = icons;
    }

    const lockTooltip = this.lockLevelService.getLockTooltip(
      entry.lockLevel,
      entry.isGroupRestricted,
    );
    const tooltip = [lockTooltip ? this.translateService.instant(lockTooltip) : '', this.movedFromNote.noteFor(entry)]
      .filter((part) => part !== '')
      .join(TOOLTIP_SEPARATOR);
    if (tooltip) {
      cell.tooltip = tooltip;
    }

    cell.sealed = entry.lockLevel > 0 || entry.isGroupRestricted;

    return cell;
  }

  protected formatWorkTime(hours: number | null): string {
    if (hours === null || hours === 0) return '';
    const wholeHours = Math.floor(Math.abs(hours));
    const mins = Math.round((Math.abs(hours) - wholeHours) * 60);
    const sign = hours < 0 ? '-' : '';
    if (wholeHours === 0) return `${sign}${mins}m`;
    if (mins === 0) return `${sign}${wholeHours}h`;
    return `${sign}${wholeHours}h ${mins}m`;
  }
}
