import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  OnInit,
  effect,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { IAbsence } from 'src/app/core/absence-class';
import { IBreak } from 'src/app/core/break-class';
import {
  HeaderDirection,
  HeaderProperties,
} from 'src/app/core/headerProperties';
import { DataManagementAbsenceGanttService } from 'src/app/data/management/data-management-absence-gantt.service';
import { daysBetweenDates } from 'src/app/helpers/format-helper';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';

@Component({
    selector: 'app-absence-gantt-grid',
    templateUrl: './absence-gantt-grid.component.html',
    styleUrls: ['./absence-gantt-grid.component.scss'],
    standalone: false
})
export class AbsenceGanttGridComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() selectedRowData: IBreak[] | undefined;

  private tmplateArrowDown = '↓';
  private tmplateArrowUp = '↑';
  private tmplateArrowUndefined = '↕';
  private ngUnsubscribe = new Subject<void>();

  currentLang: Language = MessageLibrary.DEFAULT_LANG;

  highlightRowId: string | undefined = undefined;

  arrowFrom = '';
  arrowUntil = '';
  arrowAbsence = '';

  fromHeader: HeaderProperties = new HeaderProperties();
  untilHeader: HeaderProperties = new HeaderProperties();
  absenceHeader: HeaderProperties = new HeaderProperties();

  orderBy = 'name';
  sortOrder = 'asc';

  private absence: IAbsence[] = [];

  constructor(
    public dataManagementAbsence: DataManagementAbsenceGanttService,
    private translateService: TranslateService
  ) {
    this.readSignals();
  }

  ngOnInit(): void {
    this.absence = this.dataManagementAbsence.absenceList;
    this.currentLang = this.translateService.currentLang as Language;
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onAbsenceName(value: IBreak): string {
    if (value) {
      const abs = this.absence.find((x) => x.id === value.absenceId);
      if (abs) {
        return abs.name?.[this.currentLang] ?? '';
      }
    }
    return 'undefined';
  }

  onAbsenceValue(value: IBreak): number | string {
    if (value) {
      const abs = this.absence.find((x) => x.id === value.absenceId);
      if (abs) {
        const defaultValue = abs.defaultValue!;
        if (defaultValue > 0) {
          const diff =
            Math.floor(daysBetweenDates(value.from!, value.until!)) + 1;
          return diff * defaultValue;
        }
      }
    }
    return '';
  }

  onClickedRow(value: IBreak) {
    this.highlightRowId = value.id;
  }

  onClickHeader(orderBy: string) {
    let sortOrder = '';

    if (orderBy === 'from') {
      this.fromHeader.DirectionSwitch();

      if (this.fromHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.fromHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    } else if (orderBy === 'until') {
      this.untilHeader.DirectionSwitch();

      if (this.untilHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.untilHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    } else if (orderBy === 'absence') {
      this.absenceHeader.DirectionSwitch();

      if (this.absenceHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.absenceHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    }

    this.sort(orderBy, sortOrder);
  }

  private sort(orderBy: string, sortOrder: string) {
    this.orderBy = orderBy;
    this.sortOrder = sortOrder;
    this.setHeaderArrowToUndefined();
    this.setDirection(sortOrder, this.setPosition(orderBy)!);
    this.setHeaderArrowTemplate();
  }

  private setPosition(orderBy: string): HeaderProperties | undefined {
    if (orderBy === 'from') {
      return this.fromHeader;
    }
    if (orderBy === 'until') {
      return this.untilHeader;
    }
    if (orderBy === 'absence') {
      return this.absenceHeader;
    }

    return undefined;
  }

  private setDirection(sortOrder: string, value: HeaderProperties): void {
    if (sortOrder === 'asc') {
      value.order = HeaderDirection.Down;
    }
    if (sortOrder === 'desc') {
      value.order = HeaderDirection.Up;
    }
  }

  private setHeaderArrowTemplate() {
    this.arrowFrom = this.setHeaderArrowTemplateSub(this.fromHeader);
    this.arrowUntil = this.setHeaderArrowTemplateSub(this.untilHeader);
    this.arrowAbsence = this.setHeaderArrowTemplateSub(this.absenceHeader);
  }

  private setHeaderArrowTemplateSub(value: HeaderProperties): string {
    switch (value.order) {
      case HeaderDirection.Down:
        return this.tmplateArrowDown;
      case HeaderDirection.Up:
        return this.tmplateArrowUp;
      case HeaderDirection.None:
        return ''; // this.tmplateArrowUndefined;
    }
  }

  private setHeaderArrowToUndefined() {
    this.fromHeader.order = HeaderDirection.None;
    this.untilHeader.order = HeaderDirection.None;
    this.absenceHeader.order = HeaderDirection.None;
  }

  /* #endregion   header */

  private readSignals(): void {
    effect(
      () => {
        const isReset = this.dataManagementAbsence.isReset();
        if (isReset) {
          this.absence = this.dataManagementAbsence.absenceList;
        }
      },
      { allowSignalWrites: true }
    );
  }
}
