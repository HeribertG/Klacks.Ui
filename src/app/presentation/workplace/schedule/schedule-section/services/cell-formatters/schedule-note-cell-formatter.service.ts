// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import { ICellFormatter } from './cell-formatter.interface';
import { CellTypeEnum, TextAlignmentEnum } from 'src/app/presentation/shared/grid/enums/cell-settings.enum';

import { DomainMessages } from 'src/app/domain/constants/messages';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
@Injectable()
export class ScheduleNoteCellFormatterService implements ICellFormatter {
  private translateService = inject(TranslateService);

  formatCell(entry: IScheduleCell | undefined): GridCell {
    const cell = new GridCell();
    if (!entry) return cell;

    cell.cellType = CellTypeEnum.Standard;
    cell.mainText = getLocalizedValue(entry.description, this.translateService.currentLang || DomainMessages.DEFAULT_LANG);
    cell.mainTextAlignment = TextAlignmentEnum.Left;
    cell.fontColor = '#4A90D9';

    return cell;
  }
}
