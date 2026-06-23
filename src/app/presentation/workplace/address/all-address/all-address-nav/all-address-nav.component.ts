// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Navigation/filter panel for the all-address list, providing search filters.
 * @param isComboBoxOpen - Prevents page reads while a dropdown is open
 */

import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { disabled, form, FormField } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import {
  NgbDatepickerModule,
  NgbDropdownModule,
  NgbTooltipModule,
  NgbDateStruct,
} from '@ng-bootstrap/ng-bootstrap';
import {
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate,
} from 'src/app/shared/helpers/ngb-date.helper';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { AllAddressStateService } from '../services/all-address-state.service';

interface NavFilterFormModel {
  female: boolean;
  male: boolean;
  intersexuality: boolean;
  legalEntity: boolean;
  employee: boolean;
  externEmp: boolean;
  customer: boolean;
  activeMembership: boolean;
  formerMembership: boolean;
  futureMembership: boolean;
  scopeFromFlag: boolean;
  scopeUntilFlag: boolean;
  showDeleteEntries: boolean;
}

@Component({
  selector: 'app-all-address-nav',
  templateUrl: './all-address-nav.component.html',
  styleUrls: ['./all-address-nav.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    TranslateModule,
    FontAwesomeModule,
    NgbDropdownModule,
    NgbDatepickerModule,
    NgbTooltipModule,
    FallbackPipe,
  ],
  providers: [AllAddressStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllAddressNavComponent implements OnInit, AfterViewInit, OnDestroy {
  public dataManagementClientService = inject(DataManagementClientService);
  private translateService = inject(TranslateService);
  private allAddressStateService = inject(AllAddressStateService);
  private cdr = inject(ChangeDetectorRef);

  public faCalendar = faCalendar;
  public isComboBoxOpen = false;
  public clientTypeName = DomainMessages.ENTITY_TYPE_ALL;
  public currentLang: Language = DomainMessages.DEFAULT_LANG;
  public scopeFromValue: NgbDateStruct | undefined;
  public scopeUntilValue: NgbDateStruct | undefined;

  private ngUnsubscribe = new Subject<void>();
  private isInitFinished = false;
  private initSkipCount = 0;

  public navFilterFormModel = signal<NavFilterFormModel>({
    female: true,
    male: true,
    intersexuality: true,
    legalEntity: true,
    employee: true,
    externEmp: true,
    customer: true,
    activeMembership: true,
    formerMembership: false,
    futureMembership: false,
    scopeFromFlag: false,
    scopeUntilFlag: false,
    showDeleteEntries: false,
  });
  public navFilterForm = form(this.navFilterFormModel, (f) => {
    disabled(f.showDeleteEntries, { when: () => !this.isRequestPossible() });
  });

  public readonly isRequestPossible = computed(() => {
    const f = this.navFilterFormModel();
    return f.male || f.female || f.legalEntity || f.intersexuality;
  });

  constructor() {
    effect(() => {
      if (this.dataManagementClientService.initIsRead()) {
        this.isInit();
      }
    });

    effect(() => {
      const f = this.navFilterFormModel();
      if (!this.isInitFinished) return;
      if (this.initSkipCount > 0) { this.initSkipCount--; return; }
      const cf = this.dataManagementClientService.currentFilter;
      cf.female = f.female;
      cf.male = f.male;
      cf.intersexuality = f.intersexuality;
      cf.legalEntity = f.legalEntity;
      cf.employee = f.employee;
      cf.externEmp = f.externEmp;
      cf.customer = f.customer;
      cf.activeMembership = f.activeMembership;
      cf.formerMembership = f.formerMembership;
      cf.futureMembership = f.futureMembership;
      cf.scopeFromFlag = f.scopeFromFlag || undefined;
      cf.scopeUntilFlag = f.scopeUntilFlag || undefined;
      cf.showDeleteEntries = f.showDeleteEntries;
      this.allAddressStateService.setShowDeleteEntries(f.showDeleteEntries);
      if (!this.isComboBoxOpen) {
        this.allAddressStateService.updateFilterState();
        setTimeout(() => {
          this.dataManagementClientService.readPage();
          this.cdr.markForCheck();
        }, 100);
      }
    });
  }

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
    this.setEntityName(this.dataManagementClientService.currentFilter.clientType);
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onScopeFromChange(value: NgbDateStruct | undefined): void {
    this.scopeFromValue = value;
    const date = value ? transformNgbDateStructToDate(value) : undefined;
    (this.dataManagementClientService.currentFilter as { scopeFrom: Date | undefined }).scopeFrom = date;
  }

  onScopeUntilChange(value: NgbDateStruct | undefined): void {
    this.scopeUntilValue = value;
    const date = value ? transformNgbDateStructToDate(value) : undefined;
    (this.dataManagementClientService.currentFilter as { scopeUntil: Date | undefined }).scopeUntil = date;
  }

  onOpenChange(event: boolean): void {
    this.isComboBoxOpen = event;
    if (!this.isComboBoxOpen) {
      setTimeout(() => {
        this.allAddressStateService.updateFilterState();
        this.dataManagementClientService.readPage();
        this.cdr.markForCheck();
      }, 100);
    }
  }

  onClickSetEmpty(): void {
    this.allAddressStateService.clearStoredFilter();
    this.allAddressStateService.resetFilter();
    this.scopeFromValue = undefined;
    this.scopeUntilValue = undefined;
    this.dataManagementClientService.currentFilter.scopeFrom = undefined;
    this.dataManagementClientService.currentFilter.scopeUntil = undefined;
    this.setEntityName(this.dataManagementClientService.currentFilter.clientType);
    this.navFilterFormModel.set({
      female: true,
      male: true,
      intersexuality: true,
      legalEntity: true,
      employee: true,
      externEmp: true,
      customer: true,
      activeMembership: true,
      formerMembership: false,
      futureMembership: false,
      scopeFromFlag: false,
      scopeUntilFlag: false,
      showDeleteEntries: false,
    });
    this.cdr.markForCheck();
  }

  onClickClientType(index: number): void {
    this.setEntityName(index);
    this.allAddressStateService.updateClientType(index === -1 ? -1 : index);
    this.allAddressStateService.updateFilterState();
    setTimeout(() => {
      this.dataManagementClientService.readPage();
      this.cdr.markForCheck();
    }, 100);
  }

  private setEntityName(index?: number): void {
    if (index === null || index === -1) {
      this.clientTypeName = DomainMessages.ENTITY_TYPE_ALL;
    } else {
      this.clientTypeName =
        this.dataManagementClientService.clientAttribute[index!].name;
    }
  }

  private isInit(): void {
    const cf = this.dataManagementClientService.currentFilter;
    this.initSkipCount++;
    this.navFilterFormModel.set({
      female: cf.female ?? true,
      male: cf.male ?? true,
      intersexuality: cf.intersexuality ?? true,
      legalEntity: cf.legalEntity ?? true,
      employee: cf.employee,
      externEmp: cf.externEmp,
      customer: cf.customer,
      activeMembership: cf.activeMembership ?? true,
      formerMembership: cf.formerMembership ?? false,
      futureMembership: cf.futureMembership ?? false,
      scopeFromFlag: cf.scopeFromFlag ?? false,
      scopeUntilFlag: cf.scopeUntilFlag ?? false,
      showDeleteEntries: cf.showDeleteEntries ?? false,
    });
    this.isInitFinished = true;
    this.scopeFromValue = cf.scopeFrom ? transformDateToNgbDateStruct(cf.scopeFrom) : undefined;
    this.scopeUntilValue = cf.scopeUntil ? transformDateToNgbDateStruct(cf.scopeUntil) : undefined;
    this.cdr.markForCheck();
  }
}
