// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component, ChangeDetectionStrategy,
  effect,
  OnDestroy,
  OnInit,
  inject,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  NgbModal,
  NgbModule,
  NgbPaginationModule,
} from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';

import { Subject, takeUntil } from 'rxjs';
import { Absence, IAbsence } from 'src/app/domain/models/absence/absence-class';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { DataManagementAbsenceService } from 'src/app/domain/services/absence/data-management-absence.service';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { deleteConfirmations } from 'src/app/presentation/shared/modal/delete-confirmation.helper';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { IconCopyGreyComponent } from 'src/app/presentation/icons/icon-copy-grey.component';
import { PencilIconGreyComponent } from 'src/app/presentation/icons/pencil-icon-grey.component';
import { ExcelComponent } from 'src/app/presentation/icons/excel.component';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { SimplePaginationComponent } from 'src/app/presentation/shared/simple-pagination/simple-pagination.component';
import { MacroManagementService } from 'src/app/domain/services/settings/macro-management.service';
import { IRefreshable } from 'src/app/domain/interfaces/manageable.interface';
import { DataRefreshRegistry } from 'src/app/application/services/data-refresh-registry.service';
import { RefreshEntityTokens } from 'src/app/domain/constants/refresh-entity-tokens.constants';

import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
interface AbsenceFormModel {
  name: string;
  abbreviation: string;
  description: string;
  defaultLength: number;
  defaultValue: number;
  withSaturday: boolean;
  withSunday: boolean;
  withHoliday: boolean;
  appliesToContainer: boolean;
  color: string;
  hideInGantt: boolean;
  macroId: string;
  isUnpaid: boolean;
}

@Component({
  selector: 'app-absence',
  templateUrl: './absence.component.html',
  styleUrls: ['./absence.component.scss'],
  standalone: true,
  imports: [
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
    SimplePaginationComponent,
  ],
  providers: [TableSortingService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbsenceComponent implements OnInit, AfterViewInit, OnDestroy, IRefreshable {
  public readonly refreshableEntities = RefreshEntityTokens.ABSENCE_TYPE;
  public dataManagementAbsenceService = inject(DataManagementAbsenceService);
  public macroManagementService = inject(MacroManagementService);
  public sortingService = inject(TableSortingService);

  private modalService = inject(ModalService);
  private ngbModal = inject(NgbModal);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private refreshRegistry = inject(DataRefreshRegistry);
  private unregisterRefresh?: () => void;

  public currentAbsence = new Absence();
  public currentLang: Language = DomainMessages.DEFAULT_LANG;
  public firstItemOnLastPage: number | undefined = undefined;
  public highlightRowId: string | undefined = undefined;
  public isComboBoxOpen = false;
  public isNextPage: boolean | undefined = undefined;
  public isPreviousPage: boolean | undefined = undefined;
  public message = DomainMessages.DELETE_ENTRY;
  public numberOfItemsPerPage = 7;
  public numberOfItemsPerPageMap = new Map<number, number>();
  public page = 1;

  private ngUnsubscribe = new Subject<void>();
  private isSaving = false;

  private formModel = signal<AbsenceFormModel>({
    name: '',
    abbreviation: '',
    description: '',
    defaultLength: 0,
    defaultValue: 0,
    withSaturday: false,
    withSunday: false,
    withHoliday: false,
    appliesToContainer: false,
    color: '#000000',
    hideInGantt: false,
    macroId: '',
    isUnpaid: false,
  });

  absenceForm = form(this.formModel, f => {
    debounce(f.name, 300);
    debounce(f.abbreviation, 300);
    debounce(f.description, 300);
    debounce(f.color, 300);
  });

  private abbreviationMaxLengthEffect = effect(() => {
    const current = this.formModel();
    if (current.abbreviation && current.abbreviation.length > 4) {
      this.formModel.set({ ...current, abbreviation: current.abbreviation.substring(0, 4) });
    }
  });

  private isUnpaidGateEffect = effect(() => {
    const current = this.formModel();
    const gateOpen = current.hideInGantt && current.appliesToContainer;
    if (!gateOpen && current.isUnpaid) {
      this.formModel.set({ ...current, isUnpaid: false });
    }
  });

  private isReadEffect = effect(() => {
    if (this.dataManagementAbsenceService.isRead()) {
      this.cdr.markForCheck();
    }
  });

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang as Language;

    this.sortingService.initialize({
      columns: ['name', 'description'],
      defaultOrderBy: 'name',
      defaultSortOrder: 'asc',
      useThreeWaySort: true
    });

    this.macroManagementService.loadMacros();
    this.readPage();

    this.unregisterRefresh = this.refreshRegistry.register(this);
  }

  ngAfterViewInit(): void {
    this.translate.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translate.currentLang as Language;
        this.cdr.markForCheck();
      });

    deleteConfirmations(this.modalService, 'absence')
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((id) => {
        this.deleteAbsence(id);
        this.modalService.componentContext = '';
        this.modalService.Filing = '';
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.unregisterRefresh?.();
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  reload(): void {
    this.readPage();
  }

  createNewAbsence(content: any): void {
    this.currentAbsence = new Absence();
    this.currentAbsence.name = new MultiLanguage();
    this.currentAbsence.name.de = '';
    this.currentAbsence.abbreviation = new MultiLanguage();
    this.currentAbsence.abbreviation.de = '';
    this.currentAbsence.description = new MultiLanguage();
    this.currentAbsence.description.de = '';
    this.initFormFromAbsence();
    this.openNewAbsence(content);
  }

  onClickDownloadExcel(): void {}

  onClickHeader(orderBy: string): void {
    this.sortingService.onHeaderClick(orderBy, () => this.readPage());
  }

  onClickedRow(value: IAbsence): void {
    this.highlightRowId = value.id;
  }

  onCopyAbsence(content: any, data: Absence): void {
    this.currentAbsence = cloneObject<Absence>(data);
    this.currentAbsence.id = undefined;
    this.initFormFromAbsence();
    this.openNewAbsence(content);
  }

  onEditAbsence(content: any, data: Absence): void {
    this.currentAbsence = data;
    this.initFormFromAbsence();
    this.openNewAbsence(content);
  }

  onOpenChange(event: boolean): void {
    this.isComboBoxOpen = event;
    if (this.isComboBoxOpen) {
      this.dataManagementAbsenceService.setTemporaryFilter();
    }
    if (
      !this.isComboBoxOpen &&
      this.dataManagementAbsenceService.isTemoraryFilter_Dirty()
    ) {
      setTimeout(() => {
        this.readPage();
      }, 100);
    }
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

      this.firstItemOnLastPage = this.dataManagementAbsenceService.firstItem;
    } else if (event === this.page - 1) {
      this.isPreviousPage = true;
      this.firstItemOnLastPage = this.dataManagementAbsenceService.firstItem;
    }

    setTimeout(() => {
      this.readPage();
    }, 200);
  }

  openDeleteAbsence(data: IAbsence): void {
    if (data.id) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'absence';

      this.modalService.Filing = data.id;
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  openNewAbsence(content: any): void {
    this.ngbModal.open(content, {
      size: 'md',
      centered: true,
      windowClass: 'custom-class',
      ariaLabelledBy: 'modal-edit',
    });
  }

  async onSaveModal(modal: any): Promise<void> {
    await this.saveAbsence();
    modal.close();
  }

  private async saveAbsence(): Promise<void> {
    if (this.isSaving) {
      return;
    }

    this.applyFormToAbsence();
    this.isSaving = true;

    try {
      if (this.currentAbsence.id) {
        await this.dataManagementAbsenceService.updateAbsence(
          this.currentAbsence,
          this.currentLang
        );
      } else {
        delete this.currentAbsence.id;
        await this.dataManagementAbsenceService.addAbsence(
          this.currentAbsence,
          this.currentLang
        );
      }
    } finally {
      this.isSaving = false;
    }
  }

  private deleteAbsence(id: string): void {
    this.dataManagementAbsenceService.deleteAbsence(id, this.currentLang);
  }

  private initFormFromAbsence(): void {
    const absence = this.currentAbsence;
    const lang = this.currentLang;

    let name = '';
    if (absence.name) {
      name = getLocalizedValue(absence.name, lang);
    }

    let abbreviation = '';
    if (absence.abbreviation) {
      abbreviation = getLocalizedValue(absence.abbreviation, lang);
    }

    let description = '';
    if (absence.description) {
      description = getLocalizedValue(absence.description, lang);
    }

    this.formModel.set({
      name,
      abbreviation,
      description,
      defaultLength: absence.defaultLength || 0,
      defaultValue: absence.defaultValue || 0,
      withSaturday: absence.withSaturday || false,
      withSunday: absence.withSunday || false,
      withHoliday: absence.withHoliday || false,
      appliesToContainer: absence.appliesToContainer || false,
      color: absence.color || '#000000',
      hideInGantt: absence.hideInGantt || false,
      macroId: absence.macroId || '',
      isUnpaid: absence.isUnpaid || false,
    });
  }

  private applyFormToAbsence(): void {
    const formData = this.formModel();
    const lang = this.currentLang;

    if (!this.currentAbsence.name) {
      this.currentAbsence.name = new MultiLanguage();
    }
    this.currentAbsence.name[lang] = formData.name;

    if (!this.currentAbsence.abbreviation) {
      this.currentAbsence.abbreviation = new MultiLanguage();
    }
    this.currentAbsence.abbreviation[lang] = formData.abbreviation;

    if (!this.currentAbsence.description) {
      this.currentAbsence.description = new MultiLanguage();
    }
    this.currentAbsence.description[lang] = formData.description;

    this.currentAbsence.defaultLength = formData.defaultLength;
    this.currentAbsence.defaultValue = formData.defaultValue;
    this.currentAbsence.withSaturday = formData.withSaturday;
    this.currentAbsence.withSunday = formData.withSunday;
    this.currentAbsence.withHoliday = formData.withHoliday;
    this.currentAbsence.appliesToContainer = formData.appliesToContainer;
    this.currentAbsence.color = formData.color;
    this.currentAbsence.hideInGantt = formData.hideInGantt;
    this.currentAbsence.isUnpaid = formData.isUnpaid;
    this.currentAbsence.macroId = formData.macroId || undefined;
  }

  private readPage(): void {
    const filter = this.dataManagementAbsenceService.currentFilter;

    filter.firstItemOnLastPage = this.firstItemOnLastPage;
    filter.isPreviousPage = this.isPreviousPage;
    filter.isNextPage = this.isNextPage;

    filter.orderBy = this.sortingService.getCurrentOrderBy();
    filter.sortOrder = this.sortingService.getCurrentSortOrder();

    filter.requiredPage = this.page - 1;
    filter.numberOfItemsPerPage = this.numberOfItemsPerPage;

    this.dataManagementAbsenceService.readPage(this.currentLang);
  }
}
