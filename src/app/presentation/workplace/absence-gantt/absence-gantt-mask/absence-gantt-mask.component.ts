// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  AfterViewInit,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { IAbsence } from 'src/app/domain/models/absence/absence-class';
import { BreakPlaceholder, IBreakPlaceholder } from 'src/app/domain/models/break/break-class';
import { EntrySource } from 'src/app/domain/enums/entry-source.enum';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { addDays } from 'src/app/shared/helpers/date.helper';
import { isNgbDateStructOk, transformDateToNgbDateStruct, transformNgbDateStructToDate } from 'src/app/shared/helpers/ngb-date.helper';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { Language } from 'src/app/application/helpers/sharedItems';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { AbsenceGanttGridComponent } from './absence-gantt-grid/absence-gantt-grid.component';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { SimplePaginationComponent } from 'src/app/presentation/shared/simple-pagination/simple-pagination.component';
import {
  NgbDatepickerModule,
  NgbPaginationModule,
} from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { NgClass, NgStyle } from '@angular/common';
import { RichTextEditorComponent } from 'src/app/presentation/shared/rich-text-editor/rich-text-editor.component';

@Component({
  selector: 'app-absence-gantt-mask',
  templateUrl: './absence-gantt-mask.component.html',
  styleUrls: ['./absence-gantt-mask.component.scss'],
  standalone: true,
  imports: [
    NgStyle,
    NgClass,
    FormsModule,
    NgbDatepickerModule,
    NgbPaginationModule,
    FontAwesomeModule,
    TranslateModule,
    PdfIconComponent,
    FallbackPipe,
    AbsenceGanttGridComponent,
    SimplePaginationComponent,
    RichTextEditorComponent,
  ],
  providers: [DatePipe],
})
export class AbsenceGanttMaskComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @Output() ErrorMessageEvent = new EventEmitter<string>();
  @Output() selectedBreakIndexEvent = new EventEmitter<number>();
  @Output() UpdateEvent = new EventEmitter();
  @Output() breakPlaceholderIdSelected = new EventEmitter<string>();
  @Input() selectedRow = -1;
  @Input() selectedRowBreaksMaxIndex: number | undefined;
  @Input() selectedBreakIndex = -1;
  @ViewChild(AbsenceGanttGridComponent) gridComponent!: AbsenceGanttGridComponent;

  public dataManagementAbsence = inject(DataManagementAbsenceGanttService);
  public dataManagementBreak = inject(DataManagementBreakPlaceholderService);
  private translateService = inject(TranslateService);

  public page = 1;
  public tabId = 'mask';
  public currentLang: Language = DomainMessages.DEFAULT_LANG;
  public faCalendar = faCalendar;

  private selectedBreak_dummy: IBreakPlaceholder | undefined;
  private ngUnsubscribe = new Subject<void>();

  private _internalFrom: NgbDateStruct | undefined;
  private _internalUntil: NgbDateStruct | undefined;

  get internalFrom(): NgbDateStruct | undefined {
    return this._internalFrom;
  }

  set internalFrom(value: NgbDateStruct | undefined) {
    this._internalFrom = value;
    if (this.selectedBreak && value) {
      this.selectedBreak.from = transformNgbDateStructToDate(value);
    }
  }

  get internalUntil(): NgbDateStruct | undefined {
    return this._internalUntil;
  }

  set internalUntil(value: NgbDateStruct | undefined) {
    this._internalUntil = value;
    if (this.selectedBreak && value) {
      this.selectedBreak.until = transformNgbDateStructToDate(value);
    }
  }

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ngOnChanges(changes: SimpleChanges): void {
    if (this.selectedBreak) {
      this.tabId = 'mask';
    }
    if (this.selectedRow > -1 && !this.selectedBreak) {
      this.tabId = 'list';
    }

    this.page = this.selectedBreakIndex! + 1;
    if (this.selectedBreak) {
      this._internalFrom = transformDateToNgbDateStruct(this.selectedBreak.from!);
      this._internalUntil = transformDateToNgbDateStruct(this.selectedBreak.until!);
    }
    this.selectedBreak_dummy = undefined;
    if (this.selectedBreak) {
      this.selectedBreak_dummy = cloneObject<BreakPlaceholder>(
        this.selectedBreak as BreakPlaceholder
      );
    }
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onClickNewButton() {
    const currentYear = this.dataManagementBreak.breakFilter.currentYear;
    if (this.dataManagementAbsence.hasAbsences()) {
      let id = this.dataManagementAbsence.absenceList()[0].id;
      if (this.selectedBreak) {
        id = this.selectedBreak.absenceId;
      }
      if (id) {
        const absence = this.dataManagementAbsence.getAbsenceById(id);
        const currentDate = new Date();
        const startDate = new Date(
          currentYear,
          currentDate.getMonth(),
          currentDate.getDate()
        );
        const endDate = addDays(startDate, absence?.defaultLength ?? 1);
        const newBreak = new BreakPlaceholder();
        newBreak.absenceId = id!;
        newBreak.from = startDate;
        newBreak.until = endDate;
        this.dataManagementBreak.addBreak(this.selectedRow, newBreak);
      }
    }
  }

  get selectedRowData(): IBreakPlaceholder[] | undefined {
    if (
      this.selectedRow > -1 &&
      this.selectedRow < this.dataManagementBreak.rows
    ) {
      return this.dataManagementBreak.readData(this.selectedRow);
    }
    return undefined;
  }

  get selectedBreak(): IBreakPlaceholder | undefined {
    if (
      this.selectedRow > -1 &&
      this.selectedRow < this.dataManagementBreak.rows
    ) {
      if (this.selectedBreakIndex > -1) {
        const rowData = this.dataManagementBreak.readData(this.selectedRow);
        if (rowData && this.selectedBreakIndex < rowData.length) {
          return rowData[this.selectedBreakIndex];
        }
      }
    }
    return undefined;
  }

  get isScheduleBreak(): boolean {
    return this.selectedBreak?.entrySource === EntrySource.Schedule;
  }

  onChange() {
    setTimeout(() => {
      this.change();
    }, 100);
  }

  onColor(value: IAbsence): string {
    return value?.color ?? 'transparent';
  }

  onBreakChange(event: number) {
    this.selectedBreakIndexEvent.emit(event);
  }

  private change() {
    if (this.selectedBreak) {
      if (
        isNgbDateStructOk(this._internalFrom) &&
        isNgbDateStructOk(this._internalUntil)
      ) {
        const _from = transformNgbDateStructToDate(this._internalFrom);
        const _until = transformNgbDateStructToDate(this._internalUntil);

        if (_from! > _until!) {
          this.selectedBreak.from = _until;
          this.selectedBreak.until = _from;

          this._internalFrom = transformDateToNgbDateStruct(this.selectedBreak.from!);
          this._internalUntil = transformDateToNgbDateStruct(this.selectedBreak.until!);
        } else {
          this.selectedBreak.from = _from;
          this.selectedBreak.until = _until;
        }

        this.dataManagementBreak
          .updateBreak(this.selectedRow, this.selectedBreak)
          .then(() => {
            this.UpdateEvent.emit();
          });
      } else {
        this.ErrorMessageEvent.emit(DomainMessages.ERROR_DATE);
      }
    }
  }

  /* #region db*/

  public isSelectedBreak_Dirty(): boolean {
    if (this.selectedBreak) {
      const a = this.selectedBreak as BreakPlaceholder;
      const b = this.selectedBreak_dummy as BreakPlaceholder;

      if (!compareComplexObjects(a, b)) {
        return true;
      }
    }
    return false;
  }

  public UpdateSelectedBreakIfNecessary() {
    if (this.isSelectedBreak_Dirty()) {
      this.dataManagementBreak.updateBreak(
        this.selectedRow,
        this.selectedBreak!
      );
      this.selectedBreak_dummy = cloneObject<BreakPlaceholder>(
        this.selectedBreak as BreakPlaceholder
      );
    }
  }

  addBreak(value: IBreakPlaceholder) {
    this.dataManagementBreak.readData(this.selectedRow);
    const id = this.dataManagementBreak.readClientId(this.selectedRow);
    if (id && this.selectedRow > -1) {
      value.clientId = id;
      const success = this.dataManagementBreak.addBreak(this.selectedRow, value);
      if (success) {
        this.selectedBreakIndex = this.dataManagementBreak.indexOfBreak(value);
      }
    }
  }

  /* #endregion db*/

  onExportPDF(): void {
    if (this.gridComponent) {
      this.gridComponent.exportToPDF();
    }
  }

  onPDFExported(): void {
  }

  onBreakSelected(breakPlaceholderId: string): void {
    this.breakPlaceholderIdSelected.emit(breakPlaceholderId);
  }

  onInformationChange(content: string): void {
    if (this.selectedBreak) {
      this.selectedBreak.information = content;
      this.onChange();
    }
  }
}
