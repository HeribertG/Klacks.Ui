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
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { IAbsence } from 'src/app/core/absence-class';
import { Break, IBreak } from 'src/app/core/break-class';
import { DataManagementAbsenceGanttService } from 'src/app/data/management/data-management-absence-gantt.service';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import {
  addDays,
  isNgbDateStructOk,
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate,
} from 'src/app/helpers/format-helper';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/helpers/object-helpers';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { AbsenceGanttGridComponent } from './absence-gantt-grid/absence-gantt-grid.component';
import { FallbackPipe } from 'src/app/pipes/fallback/fallback.pipe';
import { PdfIconComponent } from 'src/app/icons/pdf-icon.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  NgbDatepickerModule,
  NgbPaginationModule,
} from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { NgClass, NgFor, NgStyle } from '@angular/common';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  selector: 'app-absence-gantt-mask',
  templateUrl: './absence-gantt-mask.component.html',
  styleUrls: ['./absence-gantt-mask.component.scss'],
  standalone: true,
  imports: [
    NgStyle,
    NgFor,
    NgClass,
    FormsModule,
    NgbDatepickerModule,
    NgbPaginationModule,
    FontAwesomeModule,
    TranslateModule,
    PdfIconComponent,
    FallbackPipe,
    AbsenceGanttGridComponent,
    SharedModule,
  ],
})
export class AbsenceGanttMaskComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @Output() ErrorMessageEvent = new EventEmitter<string>();
  @Output() selectedBreakIndexEvent = new EventEmitter<number>();
  @Output() UpdateEvent = new EventEmitter();
  @Input() selectedRow = -1;
  @Input() selectedRowBreaksMaxIndex: number | undefined;
  @Input() selectedBreakIndex = -1;

  public dataManagementAbsence = inject(DataManagementAbsenceGanttService);
  public dataManagementBreak = inject(DataManagementBreakService);
  private translateService = inject(TranslateService);

  public page = 1;
  public tabId = 'mask';
  public currentLang: Language = MessageLibrary.DEFAULT_LANG;
  public faCalendar = faCalendar;

  private selectedBreak_dummy: IBreak | undefined;
  private ngUnsubscribe = new Subject<void>();

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
      this.selectedBreak.internalFrom = transformDateToNgbDateStruct(
        this.selectedBreak.from!
      );
      this.selectedBreak.internalUntil = transformDateToNgbDateStruct(
        this.selectedBreak.until!
      );
    }
    this.selectedBreak_dummy = undefined;
    if (this.selectedBreak) {
      this.selectedBreak_dummy = cloneObject<Break>(
        this.selectedBreak as Break
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
        const newBreak = new Break();
        newBreak.absenceId = id!;
        newBreak.from = startDate;
        newBreak.until = endDate;
        this.dataManagementBreak.addBreak(this.selectedRow, newBreak);
      }
    }
  }

  get selectedRowData(): IBreak[] | undefined {
    if (
      this.selectedRow > -1 &&
      this.selectedRow < this.dataManagementBreak.rows
    ) {
      return this.dataManagementBreak.readData(this.selectedRow);
    }
    return undefined;
  }

  get selectedBreak(): IBreak | undefined {
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
        isNgbDateStructOk(this.selectedBreak.internalFrom) &&
        isNgbDateStructOk(this.selectedBreak.internalUntil)
      ) {
        const _from = transformNgbDateStructToDate(
          this.selectedBreak.internalFrom
        );
        const _until = transformNgbDateStructToDate(
          this.selectedBreak.internalUntil
        );

        if (_from! > _until!) {
          this.selectedBreak.from = _until;
          this.selectedBreak.until = _from;

          this.selectedBreak.internalFrom = transformDateToNgbDateStruct(
            this.selectedBreak.from!
          );
          this.selectedBreak.internalUntil = transformDateToNgbDateStruct(
            this.selectedBreak.until!
          );
        } else {
          this.selectedBreak.from = _from;
          this.selectedBreak.until = _until;
        }

        this.dataManagementBreak
          .updateBreak(this.selectedBreakIndex, this.selectedBreak)
          .then(() => {
            this.UpdateEvent.emit();
          });
      } else {
        this.ErrorMessageEvent.emit(MessageLibrary.ERROR_DATE);
      }
    }
  }

  /* #region db*/

  public isSelectedBreak_Dirty(): boolean {
    if (this.selectedBreak) {
      const a = this.selectedBreak as Break;
      const b = this.selectedBreak_dummy as Break;

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
      this.selectedBreak_dummy = cloneObject<Break>(
        this.selectedBreak as Break
      );
    }
  }

  addBreak(value: IBreak) {
    this.dataManagementBreak.readData(this.selectedRow);
    const id = this.dataManagementBreak.readClientId(this.selectedRow);
    if (id) {
      this.dataManagementBreak.dataBreakService
        .addBreak(value as Break)
        .subscribe((x) => {
          if (this.selectedRow > -1) {
            this.dataManagementBreak.addBreak(this.selectedRow, x);
            this.selectedBreakIndex = this.dataManagementBreak.indexOfBreak(x);
          }
        });
    }
  }

  /* #endregion db*/
}
