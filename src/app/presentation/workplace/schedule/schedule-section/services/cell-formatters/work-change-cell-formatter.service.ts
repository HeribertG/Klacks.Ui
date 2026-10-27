// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Formatter for work change and expenses schedule entry cells. A work change shows its kind (correction,
 * replacement, travel, briefing), the changed time and its time range; an expenses entry shows Spesen
 * (taxable=false) or Verguetung (taxable=true) with its amount.
 * @param entry - The WorkChange or Expenses schedule entry to display
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { formatTime } from 'src/app/domain/helpers/time-format.helper';
import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-entry-type.enum';
import { WorkChangeType } from 'src/app/domain/models/workchange/work-change-type.enum';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import { CellTypeEnum } from 'src/app/presentation/shared/grid/enums/cell-settings.enum';

const MINUTES_PER_HOUR = 60;
const AMOUNT_DECIMALS = 2;

@Injectable()
export class WorkChangeCellFormatterService {
  private translateService = inject(TranslateService);
  private gridColorService = inject(GridColorService);

  formatCell(entry: IScheduleCell): GridCell {
    const cell = new GridCell();
    cell.cellType = CellTypeEnum.Standard;
    cell.mainText = this.getWorkChangeAbbreviation(entry);

    if (entry.entryType === WorkScheduleEntryType.Expenses) {
      cell.firstSubText = '';
      cell.secondSubText = this.formatAmount(entry.amount);
      cell.backgroundColor = this.gridColorService.surchargeColor;
      cell.tooltip = entry.taxable
        ? this.translateService.instant('workChange.tooltip.reimbursement')
        : this.translateService.instant('workChange.tooltip.expenses');
    } else {
      cell.firstSubText = this.formatWorkChangeTime(entry.changeTime);
      cell.secondSubText = formatTime(entry.startTime) + ' - ' + formatTime(entry.endTime);
      cell.backgroundColor = this.gridColorService.workChangeColor;
      cell.tooltip = this.resolveWorkChangeTooltip(entry);
    }

    cell.sealed = entry.lockLevel > 0 || entry.isGroupRestricted;

    return cell;
  }

  private resolveWorkChangeTooltip(entry: IScheduleCell): string {
    if (entry.replaceClientId) {
      return this.translateService.instant('workChange.tooltip.replacement');
    }
    const type = entry.workChangeType;
    if (type === WorkChangeType.TravelStart || type === WorkChangeType.TravelEnd || type === WorkChangeType.TravelWithin) {
      return this.translateService.instant('workChange.tooltip.travel');
    }
    if (type === WorkChangeType.Briefing || type === WorkChangeType.Debriefing) {
      return this.translateService.instant('workChange.tooltip.briefing');
    }
    return this.translateService.instant('workChange.tooltip.correction');
  }

  private getWorkChangeAbbreviation(entry: IScheduleCell): string {
    if (entry.entryType === WorkScheduleEntryType.Expenses) {
      return entry.taxable
        ? this.translateService.instant('workChange.abbr.reimbursement')
        : this.translateService.instant('workChange.abbr.expenses');
    }

    if (entry.replaceClientId) {
      return this.translateService.instant('workChange.abbr.replacement');
    }

    const key = this.getWorkChangeAbbreviationKey(entry.workChangeType);
    return this.translateService.instant(key);
  }

  private getWorkChangeAbbreviationKey(workChangeType: number | null | undefined): string {
    switch (workChangeType) {
      case WorkChangeType.TravelStart:
        return 'workChange.abbr.travelStart';
      case WorkChangeType.TravelEnd:
        return 'workChange.abbr.travelEnd';
      case WorkChangeType.TravelWithin:
        return 'workChange.abbr.travelWithin';
      case WorkChangeType.Briefing:
        return 'workChange.abbr.briefing';
      case WorkChangeType.Debriefing:
        return 'workChange.abbr.debriefing';
      default:
        return 'workChange.abbr.correction';
    }
  }

  private formatAmount(amount: number | null): string {
    if (amount === null || amount === 0) return '';
    return amount.toFixed(AMOUNT_DECIMALS);
  }

  private formatWorkChangeTime(hours: number | null): string {
    if (hours === null || hours === 0) return '';
    const wholeHours = Math.floor(Math.abs(hours));
    const mins = Math.round((Math.abs(hours) - wholeHours) * MINUTES_PER_HOUR);
    const sign = hours < 0 ? '-' : '';
    if (wholeHours === 0) return `${sign}${mins}m`;
    if (mins === 0) return `${sign}${wholeHours}h`;
    return `${sign}${wholeHours}h ${mins}m`;
  }
}
