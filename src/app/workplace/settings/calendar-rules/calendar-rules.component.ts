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
import { SharedModule } from 'src/app/shared/shared.module';
import { SpinnerModule } from 'src/app/spinner/spinner.module';

import { Subject, takeUntil } from 'rxjs';
import {
  CalendarRule,
  StateCountryToken,
  HolidaysListHelper,
  ICalendarRule,
} from 'src/app/core/calendar-rule-class';
import {
  HeaderDirection,
  HeaderProperties,
} from 'src/app/core/headerProperties';
import {
  IMultiLanguage,
  MultiLanguage,
} from 'src/app/core/multi-language-class';
import { DataManagementCalendarRulesService } from 'src/app/data/management/data-management-calendar-rules.service';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { ModalService, ModalType } from 'src/app/modal/modal.service';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';
import { IconCopyGreyComponent } from 'src/app/icons/icon-copy-grey.component';
import { PencilIconGreyComponent } from 'src/app/icons/pencil-icon-grey.component';
import { ExcelComponent } from 'src/app/icons/excel.component';
import { FallbackPipe } from 'src/app/pipes/fallback/fallback.pipe';
import { CalendarDropdownComponent } from 'src/app/shared/calendar-dropdown/calendar-dropdown.component';

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
    SharedModule,
    SpinnerModule,
    TrashIconRedComponent,
    IconCopyGreyComponent,
    PencilIconGreyComponent,
    ExcelComponent,
    FallbackPipe,
    CalendarDropdownComponent,
  ],
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

  // Sorting properties
  private tmplateArrowDown = '↓';
  private tmplateArrowUp = '↑';
  arrowName = '';
  arrowState = '';
  arrowCountry = '';
  arrowDescription = '';
  orderBy = 'name';
  sortOrder = 'asc';

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

  // Header properties
  nameHeader = new HeaderProperties();
  stateHeader = new HeaderProperties();
  countryHeader = new HeaderProperties();
  descriptionHeader = new HeaderProperties();

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

    this.translate.get('setting.holiday-rules.filter-states').subscribe((x) => {
      this.headerCalendarDropdown = x;
    });

    this.holidaysListHelper.currentYear = new Date().getFullYear();
    this.reReadSortData();
  }

  ngAfterViewInit(): void {
    // Subscribe to language changes
    this.translate.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translate.currentLang as Language;

        this.translate
          .get('setting.holiday-rules.filter-states')
          .subscribe((x) => {
            this.headerCalendarDropdown = x;
          });
      });

    // Subscribe to modal results
    this.modalService.resultEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: ModalType) => {
        if (x === ModalType.Delete) {
          this.deleteRule(this.modalService.Filing);
        }
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  /**
   * Read page data with current filter settings
   */
  private readPage(): void {
    const filter = this.dataManagementCalendarRulesService.currentFilter;

    // Set pagination parameters
    filter.firstItemOnLastPage = this.firstItemOnLastPage;
    filter.isPreviousPage = this.isPreviousPage;
    filter.isNextPage = this.isNextPage;

    // Set sorting parameters
    filter.orderBy = this.orderBy;
    filter.sortOrder = this.sortOrder;

    // Set page parameters
    filter.requiredPage = this.page - 1;
    filter.numberOfItemsPerPage = this.numberOfItemsPerPage;

    // Read data for the current language
    this.dataManagementCalendarRulesService.readPage(this.currentLang);
  }

  onChangeFilter(): void {
    this.dataManagementCalendarRulesService.readPage(this.currentLang);
  }

  /**
   * Handle page change events from pagination control
   */
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
    if (this.modalSelectedState) {
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

  onSelectionChange(id: string): void {
    const token =
      this.dataManagementCalendarRulesService.filteredRulesToken.find(
        (x) => x.id === id
      );

    if (token) {
      this.modalSelectedState = token;
      this.currentRule.state = token.state;
      this.currentRule.country = token.country;
    }
  }

  openDeleteRule(data: ICalendarRule): void {
    if (data.id) {
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

    // Finde den passenden State/Country Token
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
      .result.then(
        () => {
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
        },
        () => {} // Dismiss handler (leere Funktion)
      );
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
    let sortOrder = '';
    let headerProp: HeaderProperties | undefined;

    switch (orderBy) {
      case 'name':
        headerProp = this.nameHeader;
        break;
      case 'country':
        headerProp = this.countryHeader;
        break;
      case 'state':
        headerProp = this.stateHeader;
        break;
      case 'description':
        headerProp = this.descriptionHeader;
        break;
    }

    if (headerProp) {
      headerProp.DirectionSwitch();

      if (headerProp.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (headerProp.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    }

    this.sort(orderBy, sortOrder);
    this.readPage();
  }

  private sort(orderBy: string, sortOrder: string): void {
    this.orderBy = orderBy;
    this.sortOrder = sortOrder;
    this.setHeaderArrowToUndefined();

    const header = this.setPosition(orderBy);
    if (header) {
      this.setDirection(sortOrder, header);
    }

    this.setHeaderArrowTemplate();
  }

  private setPosition(orderBy: string): HeaderProperties | undefined {
    switch (orderBy) {
      case 'name':
        return this.nameHeader;
      case 'state':
        return this.stateHeader;
      case 'country':
        return this.countryHeader;
      case 'description':
        return this.descriptionHeader;
      default:
        return undefined;
    }
  }

  private setDirection(sortOrder: string, value: HeaderProperties): void {
    if (sortOrder === 'asc') {
      value.order = HeaderDirection.Down;
    }
    if (sortOrder === 'desc') {
      value.order = HeaderDirection.Up;
    }
  }

  private setHeaderArrowTemplate(): void {
    this.arrowName = this.setHeaderArrowTemplateSub(this.nameHeader);
    this.arrowState = this.setHeaderArrowTemplateSub(this.stateHeader);
    this.arrowCountry = this.setHeaderArrowTemplateSub(this.countryHeader);
    this.arrowDescription = this.setHeaderArrowTemplateSub(
      this.descriptionHeader
    );
  }

  private setHeaderArrowTemplateSub(value: HeaderProperties): string {
    switch (value.order) {
      case HeaderDirection.Down:
        return this.tmplateArrowDown;
      case HeaderDirection.Up:
        return this.tmplateArrowUp;
      case HeaderDirection.None:
        return ''; // Leerer String statt this.tmplateArrowUndefined
    }
  }

  private reReadSortData(): void {
    this.sort(this.orderBy, this.sortOrder);
  }

  private setHeaderArrowToUndefined(): void {
    this.nameHeader.order = HeaderDirection.None;
    this.stateHeader.order = HeaderDirection.None;
    this.countryHeader.order = HeaderDirection.None;
    this.descriptionHeader.order = HeaderDirection.None;
  }
  /* #endregion Header Sorting */
}
