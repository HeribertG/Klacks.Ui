/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  NgbModal,
  NgbModule,
  NgbPaginationModule,
} from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';

import { Subject, takeUntil } from 'rxjs';
import {
  CalendarRule,
  StateCountryToken,
  HolidaysListHelper,
  ICalendarRule,
} from 'src/app/domain/models/calendar-rule-class';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import {
  IMultiLanguage,
  MultiLanguage,
} from 'src/app/domain/models/multi-language-class';
import { DataManagementCalendarRulesService } from 'src/app/domain/services/calendar/data-management-calendar-rules.service';
import { Language } from 'src/app/application/helpers/sharedItems';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { IconCopyGreyComponent } from 'src/app/presentation/icons/icon-copy-grey.component';
import { PencilIconGreyComponent } from 'src/app/presentation/icons/pencil-icon-grey.component';
import { ExcelComponent } from 'src/app/presentation/icons/excel.component';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { CalendarDropdownComponent } from 'src/app/presentation/shared/calendar-dropdown/calendar-dropdown.component';
import { SimplePaginationComponent } from 'src/app/presentation/shared/simple-pagination/simple-pagination.component';

@Component({
  selector: 'app-calendar-rules',
  templateUrl: './calendar-rules.component.html',
  styleUrls: ['./calendar-rules.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbModule,
    NgbPaginationModule,
    SpinnerModule,
    TrashIconRedComponent,
    IconCopyGreyComponent,
    PencilIconGreyComponent,
    ExcelComponent,
    FallbackPipe,
    CalendarDropdownComponent,
    SimplePaginationComponent,
  ],
  providers: [TableSortingService],
})
export class CalendarRulesComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('calendarRulesForm', { static: false }) calendarRulesForm:
    | NgForm
    | undefined;

  public translate = inject(TranslateService);
  public dataManagementCalendarRulesService = inject(
    DataManagementCalendarRulesService
  );
  public sortingService = inject(TableSortingService);

  private modalService = inject(ModalService);
  private ngbModal = inject(NgbModal);

  // Pagination properties
  highlightRowId: string | undefined = undefined;
  page = 1;
  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;
  numberOfItemsPerPage = 7;
  numberOfItemsPerPageMap = new Map<number, number>();

  // Modal properties
  modalSelectedState: StateCountryToken | undefined;
  currentRule = new CalendarRule();
  currentResult = 'kein Ergebnis';

  // State properties
  holidaysListHelper = new HolidaysListHelper();
  message = MessageLibrary.DELETE_ENTRY;
  checkBoxIndeterminate = false;
  currentLang: Language = MessageLibrary.DEFAULT_LANG;
  selectedCountry = '';
  headerCalendarDropdown = '';
  isComboBoxOpen = false;

  // Clean up resources
  private ngUnsubscribe = new Subject<void>();

  constructor() {
    // Reaktiver Effekt für Datenzustände
    effect(() => {
      const isRead = this.dataManagementCalendarRulesService.isRead();
      if (isRead) {
        this.readPage();
      }
    });
  }

  ngOnInit(): void {
    this.dataManagementCalendarRulesService.init();
    this.currentLang = this.translate.currentLang as Language;

    this.sortingService.initialize({
      columns: ['name', 'state', 'country', 'description'],
      defaultOrderBy: 'name',
      defaultSortOrder: 'asc',
      useThreeWaySort: true
    });

    this.translate.get('setting.holiday-rules.filter-states')
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        this.headerCalendarDropdown = x;
      });

    this.holidaysListHelper.currentYear = new Date().getFullYear();
  }

  ngAfterViewInit(): void {
    // Subscribe to language changes
    this.translate.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translate.currentLang as Language;

        this.translate
          .get('setting.holiday-rules.filter-states')
          .pipe(takeUntil(this.ngUnsubscribe))
          .subscribe((x) => {
            this.headerCalendarDropdown = x;
          });
      });

    this.modalService.resultEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'calendar-rules'
        ) {
          this.deleteRule(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private readPage(): void {
    const filter = this.dataManagementCalendarRulesService.currentFilter;

    filter.firstItemOnLastPage = this.firstItemOnLastPage;
    filter.isPreviousPage = this.isPreviousPage;
    filter.isNextPage = this.isNextPage;

    filter.orderBy = this.sortingService.getCurrentOrderBy();
    filter.sortOrder = this.sortingService.getCurrentSortOrder();

    filter.requiredPage = this.page - 1;
    filter.numberOfItemsPerPage = this.numberOfItemsPerPage;

    this.dataManagementCalendarRulesService.readPage(this.currentLang);
  }

  onChangeFilter(): void {
    this.dataManagementCalendarRulesService.readPage(this.currentLang);
  }

  onPageChange(event: number): void {
    this.firstItemOnLastPage = undefined;
    this.isPreviousPage = undefined;
    this.isNextPage = undefined;

    if (event === this.page + 1) {
      this.isNextPage = true;

      if (!this.numberOfItemsPerPageMap.get(this.page)) {
        this.numberOfItemsPerPageMap.set(this.page, this.numberOfItemsPerPage);
      }

      this.firstItemOnLastPage =
        this.dataManagementCalendarRulesService.firstItem;
    } else if (event === this.page - 1) {
      this.isPreviousPage = true;
      this.firstItemOnLastPage =
        this.dataManagementCalendarRulesService.firstItem;
    }

    setTimeout(() => {
      this.readPage();
    }, 200);
  }

  onClickedRow(value: ICalendarRule): void {
    this.highlightRowId = value.id;
  }

  onClickExportExcel(): void {
    this.dataManagementCalendarRulesService.exportExcel();
  }

  onName(): string {
    return this.currentRule.name?.[this.currentLang] ?? '';
  }

  /* #region Filter */
  onOpenChange(event: boolean): void {
    this.isComboBoxOpen = event;
    if (this.isComboBoxOpen) {
      this.dataManagementCalendarRulesService.setTemporaryFilter();
    }
    if (
      !this.isComboBoxOpen &&
      this.dataManagementCalendarRulesService.isTemoraryFilter_Dirty()
    ) {
      setTimeout(() => {
        this.readPage();
      }, 100);
    }
  }
  /* #endregion Filter */

  /* #region Modal Handling */
  onModalChange(): void {
    if (this.modalSelectedState && this.currentRule.rule) {
      this.currentRule.state = this.modalSelectedState.state;
      this.currentRule.country = this.modalSelectedState.country;

      this.holidaysListHelper.clear();
      this.holidaysListHelper.add(this.currentRule);
      this.holidaysListHelper.computeHolidays();

      this.currentResult =
        this.holidaysListHelper.holidayList.length == 1
          ? this.holidaysListHelper.holidayList[0].currentDate.toDateString()
          : 'kein Ergebnis';
    }
  }

  onCountryChange(country: string): void {
    this.currentRule.country = country;

    const filteredStates = this.getFilteredStates();
    if (filteredStates.length > 0) {
      this.currentRule.state = filteredStates[0].state;
      this.modalSelectedState = filteredStates[0];
    }

    this.onModalChange();
  }

  onStateChange(state: string): void {
    this.currentRule.state = state;

    const token = this.dataManagementCalendarRulesService.currentFilter.list.find(
      (x) => x.state === state && x.country === this.currentRule.country
    );

    if (token) {
      this.modalSelectedState = token;
    }

    this.onModalChange();
  }

  getFilteredStates(): StateCountryToken[] {
    if (!this.currentRule.country) {
      return [];
    }

    return this.dataManagementCalendarRulesService.currentFilter.list.filter(
      (x) => x.country === this.currentRule.country
    );
  }

  openDeleteRule(data: ICalendarRule): void {
    if (data.id) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'calendar-rules';

      this.modalService.Filing = data.id;
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  onCountryName(value: string): string {
    return value;
  }

  onCopyRule(content: any, data: CalendarRule): void {
    this.holidaysListHelper.clear();
    this.currentRule = { ...data, id: '' }; // Kopie erstellen mit neuem ID
    this.initMultiLanguage();
    this.onModalChange();
    this.openNewRule(content);
  }

  onEditRule(content: any, data: CalendarRule): void {
    this.holidaysListHelper.clear();
    this.currentRule = data;

    const token =
      this.dataManagementCalendarRulesService.filteredRulesToken.find(
        (x) =>
          x.state === this.currentRule.state &&
          x.country == this.currentRule.country
      );

    if (token) {
      this.modalSelectedState = token;
    }

    this.initMultiLanguage();
    this.onModalChange();
    this.openNewRule(content);
  }

  createNewRule(content: any): void {
    this.holidaysListHelper.clear();
    this.currentRule = new CalendarRule();
    this.initMultiLanguage();

    if (this.dataManagementCalendarRulesService.currentFilter.countries.length > 0) {
      const firstCountry = this.dataManagementCalendarRulesService.currentFilter.countries[0];
      this.currentRule.country = firstCountry;

      const filteredStates = this.dataManagementCalendarRulesService.currentFilter.list.filter(
        (x) => x.country === firstCountry
      );

      if (filteredStates.length > 0) {
        this.currentRule.state = filteredStates[0].state;
        this.modalSelectedState = filteredStates[0];
      }
    }

    this.openNewRule(content);
  }

  openNewRule(content: any): void {
    this.ngbModal
      .open(content, {
        size: 'md',
        centered: true,
        windowClass: 'custom-class',
        ariaLabelledBy: 'modal-edit',
      })
      .result.then(() => {
        if (this.currentRule.id) {
          this.dataManagementCalendarRulesService.updateCalendarRule(
            this.currentRule,
            this.currentLang
          );
        } else {
          this.dataManagementCalendarRulesService.addCalendarRule(
            this.currentRule,
            this.currentLang
          );
        }

        this.readPage();
      });
  }

  private initMultiLanguage(): void {
    if (!this.currentRule.name) {
      this.currentRule.name = new MultiLanguage();
    }

    if (
      this.currentRule.name[this.currentLang as keyof IMultiLanguage] ===
      undefined
    ) {
      this.currentRule.name[this.currentLang as keyof IMultiLanguage] = '';
    }

    if (!this.currentRule.description) {
      this.currentRule.description = new MultiLanguage();
    }

    if (
      this.currentRule.description[this.currentLang as keyof IMultiLanguage] ===
      undefined
    ) {
      this.currentRule.description[this.currentLang as keyof IMultiLanguage] =
        '';
    }
  }

  private deleteRule(id: string): void {
    this.dataManagementCalendarRulesService.deleteCalendarRule(
      id,
      this.currentLang
    );
  }
  /* #endregion Modal Handling */

  /* #region Header Sorting */
  onClickHeader(orderBy: string): void {
    this.sortingService.onHeaderClick(orderBy, () => this.readPage());
  }
  /* #endregion Header Sorting */
}
