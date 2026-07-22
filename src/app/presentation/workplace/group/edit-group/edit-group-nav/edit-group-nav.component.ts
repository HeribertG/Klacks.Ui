// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Navigation filter component for the edit-group view (client filters: gender, membership, date range, region).
 */

import {
  Component,
  DestroyRef,
  Injector,
  OnInit,
  effect,
  inject,
  runInInjectionContext,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField, form } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Filter } from 'src/app/domain/models/client/client-class';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';

import {
  NgbDatepickerModule,
  NgbDropdownModule,
  NgbTooltipModule,
  NgbDateStruct,
} from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { transformDateToNgbDateStruct, transformNgbDateStructToDate } from 'src/app/shared/helpers/ngb-date.helper';

interface EditGroupNavFilterModel {
  female: boolean;
  male: boolean;
  legalEntity: boolean;
  activeMembership: boolean;
  formerMembership: boolean;
  futureMembership: boolean;
  scopeFromFlag: boolean;
  scopeUntilFlag: boolean;
}

@Component({
  selector: 'app-edit-group-nav',
  templateUrl: './edit-group-nav.component.html',
  styleUrls: ['./edit-group-nav.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    NgbDropdownModule,
    NgbDatepickerModule,
    NgbTooltipModule,
    TranslateModule,
    FontAwesomeModule,
    FallbackPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditGroupNavComponent implements OnInit {
  public dataManagementGroupService = inject(DataManagementGroupService);
  private translateService = inject(TranslateService);
  private localStorageService = inject(LocalStorageService);
  private injector = inject(Injector);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  public navGroup: HTMLElement | undefined;
  public faCalendar = faCalendar;
  public isComboBoxOpen = false;

  public clientTypeName = DomainMessages.ENTITY_TYPE_ALL;

  public isInitFinished = false;
  private initSkipCount = 0;
  public defaultTop = 0;
  public currentLang: Language = DomainMessages.DEFAULT_LANG;

  public scopeFromValue: NgbDateStruct | undefined;
  public scopeUntilValue: NgbDateStruct | undefined;

  public navFilterFormModel = signal<EditGroupNavFilterModel>({
    female: false,
    male: false,
    legalEntity: false,
    activeMembership: false,
    formerMembership: false,
    futureMembership: false,
    scopeFromFlag: false,
    scopeUntilFlag: false,
  });
  public navFilterForm = form(this.navFilterFormModel, () => {});

  onScopeFromChange(value: NgbDateStruct | undefined): void {
    this.scopeFromValue = value;
    const filter = this.dataManagementGroupService.currentClientFilter;
    filter.scopeFrom = value ? transformNgbDateStructToDate(value) : undefined;
  }

  onScopeUntilChange(value: NgbDateStruct | undefined): void {
    this.scopeUntilValue = value;
    const filter = this.dataManagementGroupService.currentClientFilter;
    filter.scopeUntil = value ? transformNgbDateStructToDate(value) : undefined;
  }

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
    this.dataManagementGroupService.init();

    this.navGroup = document.getElementById('navGroupForm')!;

    this.readSignals();

    this.translateService.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
        this.cdr.markForCheck();
      });
  }

  private isInit(): void {
    const filter = this.dataManagementGroupService.currentClientFilter;
    this.initSkipCount++;
    this.navFilterFormModel.set({
      female: filter.female ?? false,
      male: filter.male ?? false,
      legalEntity: filter.legalEntity ?? false,
      activeMembership: filter.activeMembership ?? false,
      formerMembership: filter.formerMembership ?? false,
      futureMembership: filter.futureMembership ?? false,
      scopeFromFlag: filter.scopeFromFlag ?? false,
      scopeUntilFlag: filter.scopeUntilFlag ?? false,
    });
    this.isInitFinished = true;
  }

  onOpenChange(event: boolean) {
    this.isComboBoxOpen = event;
    if (this.isComboBoxOpen) {
      this.dataManagementGroupService.setTemporaryFilter();
    }
    if (
      !this.isComboBoxOpen &&
      this.dataManagementGroupService.isTemoraryFilter_Dirty()
    ) {
      setTimeout(() => {
        this.dataManagementGroupService.headerCheckBoxValue = false;
        this.dataManagementGroupService.readPage();
        this.cdr.markForCheck();
      }, 100);
    }
  }

  onClickSetEmpty() {
    this.localStorageService.remove('edit-address');
    this.dataManagementGroupService.currentClientFilter = new Filter();
    this.scopeFromValue = undefined;
    this.scopeUntilValue = undefined;
    this.initSkipCount++;
    this.navFilterFormModel.set({
      female: false,
      male: false,
      legalEntity: false,
      activeMembership: false,
      formerMembership: false,
      futureMembership: false,
      scopeFromFlag: false,
      scopeUntilFlag: false,
    });
    this.onClickClientType(
      this.dataManagementGroupService.currentClientFilter.clientType
    );
  }

  onClickClientType(index: number) {
    this.setEntityName(index);

    if (index === -1) {
      this.dataManagementGroupService.currentClientFilter.clientType = -1;
    } else {
      this.dataManagementGroupService.currentClientFilter.clientType = index;
      this.dataManagementGroupService.clearCheckedArray();
      this.dataManagementGroupService.headerCheckBoxValue = false;
    }

    setTimeout(() => {
      this.dataManagementGroupService.readPage();
      this.cdr.markForCheck();
    }, 100);
  }

  private setEntityName(index?: number) {
    if (index === null || index === -1) {
      this.clientTypeName = DomainMessages.ENTITY_TYPE_ALL;
    } else {
      this.clientTypeName =
        this.dataManagementGroupService.clientAttribute[index!].name;
    }
  }

  isRequestPossible(): boolean {
    const f = this.navFilterFormModel();
    return f.male || f.female || f.legalEntity;
  }

  private syncFormToService(): void {
    const f = this.navFilterFormModel();
    const filter = this.dataManagementGroupService.currentClientFilter;
    filter.female = f.female;
    filter.male = f.male;
    filter.legalEntity = f.legalEntity;
    filter.activeMembership = f.activeMembership;
    filter.formerMembership = f.formerMembership;
    filter.futureMembership = f.futureMembership;
    filter.scopeFromFlag = f.scopeFromFlag;
    filter.scopeUntilFlag = f.scopeUntilFlag;
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        if (this.dataManagementGroupService.initIsRead()) {
          const filter = this.dataManagementGroupService.currentClientFilter;
          this.scopeFromValue = filter.scopeFrom ? transformDateToNgbDateStruct(filter.scopeFrom) : undefined;
          this.scopeUntilValue = filter.scopeUntil ? transformDateToNgbDateStruct(filter.scopeUntil) : undefined;
          this.isInit();
        }
      });

      effect(() => {
        const _ = this.navFilterFormModel();
        if (!this.isInitFinished) return;
        if (this.initSkipCount > 0) { this.initSkipCount--; return; }
        if (!this.isComboBoxOpen) {
          this.syncFormToService();
          setTimeout(() => {
            this.dataManagementGroupService.readPage();
            this.cdr.markForCheck();
          }, 100);
        }
      });
    });
  }
}
