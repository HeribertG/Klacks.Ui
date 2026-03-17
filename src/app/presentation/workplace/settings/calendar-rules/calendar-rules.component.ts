// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  effect,
  inject,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
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
} from 'src/app/domain/models/calendar/calendar-rule-class';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import {
  IMultiLanguage,
  MultiLanguage,
} from 'src/app/domain/models/translation/multi-language-class';
import { DataManagementCalendarRulesService } from 'src/app/domain/services/calendar/data-management-calendar-rules.service';
import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
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

interface RuleFormModel {
  name: string;
  rule: string;
  subRule: string;
  description: string;
  isMandatory: boolean;
  isPaid: boolean;
}

@Component({
  selector: 'app-calendar-rules',
  templateUrl: './calendar-rules.component.html',
  styleUrls: ['./calendar-rules.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FormField,
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
    SimplePaginationComponent
],
  providers: [TableSortingService],
})
export class CalendarRulesComponent
  implements OnInit, AfterViewInit, OnDestroy
{

  public translate = inject(TranslateService);
  public dataManagementCalendarRulesService = inject(
    DataManagementCalendarRulesService
  );
  public sortingService = inject(TableSortingService);

  private modalService = inject(ModalService);
  private ngbModal = inject(NgbModal);
  private manualLoader = inject(ManualLoaderService);

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

  // SignalForm for modal
  public ruleFormModel = signal<RuleFormModel>({
    name: '',
    rule: '',
    subRule: '',
    description: '',
    isMandatory: false,
    isPaid: false,
  });
  ruleForm = form(this.ruleFormModel);

  // State properties
  holidaysListHelper = new HolidaysListHelper();
  message = DomainMessages.DELETE_ENTRY;
  checkBoxIndeterminate = false;
  currentLang: Language = DomainMessages.DEFAULT_LANG;
  selectedCountry = '';
  headerCalendarDropdown = '';
  isComboBoxOpen = false;
  tabId = signal<'form' | 'help'>('form');
  manualContent = signal('');

  // Clean up resources
  private ngUnsubscribe = new Subject<void>();

  constructor() {
    effect(() => {
      const isRead = this.dataManagementCalendarRulesService.isRead();
      if (isRead) {
        this.readPage();
      }
    });

    effect(() => {
      const formData = this.ruleFormModel();
      this.syncFormToRule(formData);
    });

    effect(() => {
      const data = this.ruleFormModel();
      const maxLen = 256;
      const clamped = {
        name: data.name.length > maxLen ? data.name.substring(0, maxLen) : data.name,
        rule: data.rule.length > maxLen ? data.rule.substring(0, maxLen) : data.rule,
        subRule: data.subRule.length > maxLen ? data.subRule.substring(0, maxLen) : data.subRule,
        description: data.description.length > maxLen ? data.description.substring(0, maxLen) : data.description,
      };

      if (
        clamped.name !== data.name ||
        clamped.rule !== data.rule ||
        clamped.subRule !== data.subRule ||
        clamped.description !== data.description
      ) {
        this.ruleFormModel.update(m => ({
          ...m,
          name: clamped.name,
          rule: clamped.rule,
          subRule: clamped.subRule,
          description: clamped.description,
        }));
      }
    });
  }

  private syncFormToRule(formData: RuleFormModel): void {
    if (!this.currentRule.name) {
      this.currentRule.name = new MultiLanguage();
    }
    if (!this.currentRule.description) {
      this.currentRule.description = new MultiLanguage();
    }
    this.currentRule.name[this.currentLang as keyof IMultiLanguage] = formData.name;
    this.currentRule.rule = formData.rule;
    this.currentRule.subRule = formData.subRule;
    this.currentRule.description[this.currentLang as keyof IMultiLanguage] = formData.description;
    this.currentRule.isMandatory = formData.isMandatory;
    this.currentRule.isPaid = formData.isPaid;
  }

  private loadRuleToForm(): void {
    this.ruleFormModel.set({
      name: this.currentRule.name?.[this.currentLang as keyof IMultiLanguage] ?? '',
      rule: this.currentRule.rule ?? '',
      subRule: this.currentRule.subRule ?? '',
      description: this.currentRule.description?.[this.currentLang as keyof IMultiLanguage] ?? '',
      isMandatory: this.currentRule.isMandatory ?? false,
      isPaid: this.currentRule.isPaid ?? false,
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
    return this.ruleFormModel().name;
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

      const currentYearEntry = this.holidaysListHelper.holidayList.find(
        (h) => h.currentDate?.getFullYear() === this.holidaysListHelper.currentYear
      );
      this.currentResult = currentYearEntry
        ? currentYearEntry.currentDate.toDateString()
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
    this.currentRule = { ...data, id: '' };
    this.loadRuleToForm();
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

    this.loadRuleToForm();
    this.onModalChange();
    this.openNewRule(content);
  }

  createNewRule(content: any): void {
    this.holidaysListHelper.clear();
    this.currentRule = new CalendarRule();
    this.currentRule.name = new MultiLanguage();
    this.currentRule.description = new MultiLanguage();

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

    this.loadRuleToForm();
    this.openNewRule(content);
  }

  openNewRule(content: any): void {
    this.tabId.set('form');
    this.loadManual();
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

  /* #region Help */
  loadManual(): void {
    const lang = this.translate.currentLang || 'de';
    this.manualLoader.loadManual('calendar-rule-manual', lang)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(content => this.manualContent.set(content));
  }
  /* #endregion Help */
}
