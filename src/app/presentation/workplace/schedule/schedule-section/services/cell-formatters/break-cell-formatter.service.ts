import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IScheduleCell } from 'src/app/domain/models/work-schedule-class';
import { AbsenceMenuService } from 'src/app/domain/services/schedule/absence-menu.service';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import { CellTypeEnum } from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { formatTime } from 'src/app/shared/helpers/time-format.helper';
import { ICellFormatter } from './cell-formatter.interface';
import { EmptyCellFormatterService } from './empty-cell-formatter.service';

@Injectable()
export class BreakCellFormatterService implements ICellFormatter {
  private emptyFormatter = inject(EmptyCellFormatterService);
  private absenceMenuService = inject(AbsenceMenuService);
  private translateService = inject(TranslateService);

  formatCell(entry: IScheduleCell | undefined): GridCell {
    if (!entry) {
      return this.emptyFormatter.formatCell(entry);
    }

    const language = this.translateService.currentLang || 'en';
    const abbreviation = this.absenceMenuService.getAbbreviationForEntryId(entry.entryId, language);

    const cell = new GridCell();
    cell.cellType = CellTypeEnum.Standard;
    cell.mainText = abbreviation;
    cell.firstSubText = this.formatWorkTime(entry.changeTime);
    cell.secondSubText =
      formatTime(entry.startTime) + ' - ' + formatTime(entry.endTime);

    const color = this.absenceMenuService.getColorForEntryId(entry.entryId);
    if (color) {
      cell.backgroundColor = color;
    }

    return cell;
  }

  private formatWorkTime(hours: number | null): string {
    if (hours === null || hours === 0) return '';
    const wholeHours = Math.floor(Math.abs(hours));
    const mins = Math.round((Math.abs(hours) - wholeHours) * 60);
    const sign = hours < 0 ? '-' : '';
    if (wholeHours === 0) return `${sign}${mins}m`;
    if (mins === 0) return `${sign}${wholeHours}h`;
    return `${sign}${wholeHours}h ${mins}m`;
  }
}
