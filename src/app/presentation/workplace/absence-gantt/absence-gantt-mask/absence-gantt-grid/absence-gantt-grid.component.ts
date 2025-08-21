import { DatePipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  EffectRef,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output,
  EventEmitter,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { IAbsence } from 'src/app/domain/models/absence-class';
import { IBreak } from 'src/app/domain/models/break-class';
import {
  HeaderDirection,
  HeaderProperties,
} from 'src/app/domain/models/headerProperties';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/data-management-absence-gantt.service';
import { DataManagementBreakService } from 'src/app/domain/services/data-management-break.service';
import { daysBetweenDates } from 'src/app/domain/helpers/format-helper';
import { Language } from 'src/app/application/helpers/sharedItems';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { PdfExportService } from '../../services/pdf-export.service';

@Component({
  selector: 'app-absence-gantt-grid',
  templateUrl: './absence-gantt-grid.component.html',
  styleUrls: ['./absence-gantt-grid.component.scss'],
  standalone: true,
  imports: [DatePipe, TranslateModule],
})
export class AbsenceGanttGridComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() selectedRowData: IBreak[] | undefined;
  @Input() selectedRow = -1;
  @Output() exportPDF = new EventEmitter<void>();
  @Output() breakSelected = new EventEmitter<string>();

  public dataManagementAbsence = inject(DataManagementAbsenceGanttService);
  public dataManagementBreak = inject(DataManagementBreakService);
  private translateService = inject(TranslateService);
  private injector = inject(Injector);
  private pdfExportService = inject(PdfExportService);

  private tmplateArrowDown = '↓';
  private tmplateArrowUp = '↑';
  private tmplateArrowUndefined = '↕';

  currentLang: Language = MessageLibrary.DEFAULT_LANG;

  highlightRowId: string | undefined = undefined;

  arrowFrom = '';
  arrowUntil = '';
  arrowAbsence = '';

  private ngUnsubscribe = new Subject<void>();
  private effectRef: EffectRef | null = null;

  fromHeader: HeaderProperties = new HeaderProperties();
  untilHeader: HeaderProperties = new HeaderProperties();
  absenceHeader: HeaderProperties = new HeaderProperties();

  orderBy = 'absence';
  sortOrder = 'asc';

  private absence: IAbsence[] = [];

  ngOnInit(): void {
    this.readSignals();
    this.absence = this.dataManagementAbsence.absenceList();
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

    if (this.effectRef) {
      this.effectRef.destroy();
      this.effectRef = null;
    }
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
    if (value.id) {
      this.breakSelected.emit(value.id);
    }
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
    
    if (this.selectedRowData && this.selectedRowData.length > 0) {
      this.sortSelectedRowData(orderBy, sortOrder);
    }
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

  private sortSelectedRowData(orderBy: string, sortOrder: string) {
    if (!sortOrder || sortOrder === '' || !this.selectedRowData) {
      return;
    }

    const multiplier = sortOrder === 'asc' ? 1 : -1;

    this.selectedRowData = [...this.selectedRowData].sort((a, b) => {
      if (orderBy === 'from') {
        return this.compareDates(a.from, b.from) * multiplier;
      } else if (orderBy === 'until') {
        return this.compareDates(a.until, b.until) * multiplier;
      } else if (orderBy === 'absence') {
        return this.compareAbsences(a, b) * multiplier;
      }
      return 0;
    });
  }

  private compareDates(date1: Date | undefined, date2: Date | undefined): number {
    if (!date1 && !date2) return 0;
    if (!date1) return -1;
    if (!date2) return 1;
    
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    
    return d1.getTime() - d2.getTime();
  }

  private compareAbsences(a: IBreak, b: IBreak): number {
    const absenceA = this.absence.find(x => x.id === a.absenceId);
    const absenceB = this.absence.find(x => x.id === b.absenceId);
    
    const nameA = absenceA?.name?.[this.currentLang] ?? '';
    const nameB = absenceB?.name?.[this.currentLang] ?? '';
    
    return nameA.localeCompare(nameB);
  }

  /* #endregion   header */

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      this.effectRef = effect(() => {
        const isReset = this.dataManagementAbsence.isReset();
        if (isReset) {
          this.absence = this.dataManagementAbsence.absenceList();
        }
      });
    });
  }

  exportToPDF(): void {
    if (!this.selectedRowData || this.selectedRowData.length === 0) {
      return;
    }

    const clientName = this.getClientName();
    
    this.pdfExportService.exportBreaksTableToPdf(
      this.selectedRowData,
      clientName,
      (breakItem) => this.onAbsenceName(breakItem),
      (breakItem) => this.onAbsenceValue(breakItem)
    );
    
    this.exportPDF.emit();
  }

  private getClientName(): string {
    if (this.selectedRow >= 0 && this.selectedRow < this.dataManagementBreak.clients.length) {
      const client = this.dataManagementBreak.clients[this.selectedRow];
      const firstName = client.firstName || '';
      const lastName = client.name || '';
      const company = client.company || '';
      
      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }
      return company;
    }
    return 'Unknown Client';
  }
}
