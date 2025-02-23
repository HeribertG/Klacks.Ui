import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
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

@Component({
    selector: 'app-calendar-rules',
    templateUrl: './calendar-rules.component.html',
    styleUrls: ['./calendar-rules.component.scss'],
    standalone: false
})
export class CalendarRulesComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('calendarRulesForm', { static: false }) calendarRulesForm:
    | NgForm
    | undefined;

  highlightRowId: string | undefined = undefined;
  page = 1;
  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;

  numberOfItemsPerPage = 7;
  numberOfItemsPerPageMap = new Map();

  private tmplateArrowDown = '↓';
  private tmplateArrowUp = '↑';
  private tmplateArrowUndefined = '↕';

  arrowName = '';
  arrowState = '';
  arrowCountry = '';
  arrowDescription = '';

  orderBy = 'name';
  sortOrder = 'asc';

  modalSelectedState: StateCountryToken | undefined = undefined;
  currentRule = new CalendarRule();
  currentResult = 'kein Ergebnis';

  holidaysListHelper = new HolidaysListHelper();

  message = MessageLibrary.DELETE_ENTRY;
  checkBoxIndeterminate = false;

  nameHeader: HeaderProperties = new HeaderProperties();
  stateHeader: HeaderProperties = new HeaderProperties();
  countryHeader: HeaderProperties = new HeaderProperties();
  descriptionHeader: HeaderProperties = new HeaderProperties();

  objectForUnsubscribe: any;

  isComboBoxOpen = false;

  currentLang: Language = MessageLibrary.DEFAULT_LANG;

  selectedCountry: string = '';
  headerCalendarDropdown = '';

  private ngUnsubscribe = new Subject<void>();

  constructor(
    public dataManagementCalendarRulesService: DataManagementCalendarRulesService,
    private ngbModal: NgbModal,
    private translateService: TranslateService,
    private modalService: ModalService
  ) {
    effect(
      () => {
        const isRead = this.dataManagementCalendarRulesService.isRead();
        if (isRead) {
          this.readPage();
        }
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
    this.dataManagementCalendarRulesService.init();
    this.currentLang = this.translateService.currentLang as Language;
    this.translateService
      .get('setting.holiday-rules.filter-states')
      .subscribe((x) => {
        this.headerCalendarDropdown = x;
      });
    this.holidaysListHelper.currentYear = new Date().getFullYear();
    this.reReadSortData();
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
        this.translateService
          .get('setting.holiday-rules.filter-states')
          .subscribe((x) => {
            this.headerCalendarDropdown = x;
          });
      });
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

  private readPage() {
    this.dataManagementCalendarRulesService.currentFilter.firstItemOnLastPage =
      this.firstItemOnLastPage;
    this.dataManagementCalendarRulesService.currentFilter.isPreviousPage =
      this.isPreviousPage;
    this.dataManagementCalendarRulesService.currentFilter.isNextPage =
      this.isNextPage;

    this.dataManagementCalendarRulesService.currentFilter.orderBy =
      this.orderBy;
    this.dataManagementCalendarRulesService.currentFilter.sortOrder =
      this.sortOrder;
    this.dataManagementCalendarRulesService.currentFilter.requiredPage =
      this.page - 1;
    this.dataManagementCalendarRulesService.currentFilter.numberOfItemsPerPage =
      this.numberOfItemsPerPage;

    this.dataManagementCalendarRulesService.readPage(this.currentLang);
  }

  onChangeFilter() {
    this.dataManagementCalendarRulesService.readPage(this.currentLang);
  }

  onPageChange(event: number) {
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

  onClickedRow(value: ICalendarRule) {
    this.highlightRowId = value.id;
  }

  onClickExportExcel() {
    this.dataManagementCalendarRulesService.exportExcel();
  }

  onName(): string {
    return this.currentRule.name?.[this.currentLang] ?? '';
  }

  /* #region Filter */
  onOpenChange(event: boolean) {
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
  /* #region   MsgBox */

  onModalChange() {
    this.currentRule.state = this.modalSelectedState!.state;
    this.currentRule.country = this.modalSelectedState!.country;

    this.holidaysListHelper.clear();

    this.holidaysListHelper.add(this.currentRule);
    this.holidaysListHelper.computeHolidays();
    this.currentResult =
      this.holidaysListHelper.holidayList.length == 1
        ? this.holidaysListHelper.holidayList[0].currentDate.toDateString()
        : 'kein Ergebnis';
  }

  onSelectionChange(id: string) {
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

  openDeleteRule(data: ICalendarRule) {
    this.modalService.Filing = data.id!;
    this.modalService.deleteMessage = this.message;
    this.modalService.setDefault(ModalType.Delete);
    this.modalService.openModel(ModalType.Delete);
  }
  onCountryName(value: string): string {
    return value;
  }

  onCopyRule(content: any, data: CalendarRule) {
    this.holidaysListHelper.clear();
    this.currentRule = data;
    this.currentRule.id = '';
    this.initMultiLanguage();
    this.onModalChange();
    this.openNewRule(content);
  }

  onEditRule(content: any, data: CalendarRule) {
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

  createNewRule(content: any) {
    this.holidaysListHelper.clear();
    this.currentRule = new CalendarRule();
    this.initMultiLanguage();

    this.openNewRule(content);
  }

  openNewRule(content: any) {
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
        () => {}
      );
  }

  private initMultiLanguage() {
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

  private deleteRule(id: string) {
    this.dataManagementCalendarRulesService.deleteCalendarRule(
      id,
      this.currentLang
    );
  }

  /* #endregion   MsgBox */

  /* #region   header */

  onClickHeader(orderBy: string) {
    let sortOrder = '';

    if (orderBy === 'name') {
      this.nameHeader.DirectionSwitch();

      if (this.nameHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.nameHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    } else if (orderBy === 'country') {
      this.countryHeader.DirectionSwitch();

      if (this.countryHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.countryHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    } else if (orderBy === 'state') {
      this.stateHeader.DirectionSwitch();

      if (this.stateHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.stateHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    } else if (orderBy === 'description') {
      this.descriptionHeader.DirectionSwitch();

      if (this.descriptionHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.descriptionHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    }

    this.sort(orderBy, sortOrder);
    this.readPage();
  }

  private sort(orderBy: string, sortOrder: string) {
    this.orderBy = orderBy;
    this.sortOrder = sortOrder;
    this.setHeaderArrowToUndefined();
    this.setDirection(sortOrder, this.setPosition(orderBy)!);
    this.setHeaderArrowTemplate();
  }

  private setPosition(orderBy: string): HeaderProperties | undefined {
    if (orderBy === 'name') {
      return this.nameHeader;
    }
    if (orderBy === 'state') {
      return this.stateHeader;
    }
    if (orderBy === 'country') {
      return this.countryHeader;
    }
    if (orderBy === 'description') {
      return this.descriptionHeader;
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
        return ''; // this.tmplateArrowUndefined;
    }
  }

  private reReadSortData() {
    this.sort(this.orderBy, this.sortOrder);
  }

  private setHeaderArrowToUndefined() {
    this.nameHeader.order = HeaderDirection.None;
    this.stateHeader.order = HeaderDirection.None;
    this.countryHeader.order = HeaderDirection.None;
    this.descriptionHeader.order = HeaderDirection.None;
  }

  /* #endregion   header */

  private readSignals(): void {}
}
