// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for managing IndividualPeriod aggregates (custom pay-period definitions
 * selectable on contracts with PaymentInterval.Individual). List + modal editor with an
 * inline editable periods table (from/until date, full hours per row).
 */
import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  TemplateRef,
  viewChild,
  signal,
  computed,
  effect,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { form, FormField, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { NgbModal, NgbModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { DataManagementIndividualPeriodService } from 'src/app/domain/services/scheduling/data-management-individual-period.service';
import { IIndividualPeriod, IPeriod, Period } from 'src/app/domain/models/scheduling/individual-period.model';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { deleteConfirmations } from 'src/app/presentation/shared/modal/delete-confirmation.helper';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import { transformDateToNgbDateStruct, transformNgbDateStructToDate } from 'src/app/shared/helpers/ngb-date.helper';

interface IndividualPeriodFormModel {
  name: string;
}

@Component({
  selector: 'app-individual-periods',
  templateUrl: './individual-periods.component.html',
  styleUrls: ['./individual-periods.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    SettingsListCardComponent,
    DateInputComponent,
    TrashIconRedComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndividualPeriodsComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly periodModal = viewChild.required<TemplateRef<unknown>>('periodModal');

  public dataManagementIndividualPeriodService = inject(DataManagementIndividualPeriodService);
  public translate = inject(TranslateService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  public editingIndividualPeriod: IIndividualPeriod | null = null;
  private originalIndividualPeriod: IIndividualPeriod | null = null;
  public isNewIndividualPeriod = false;
  private isSaving = false;
  message = DomainMessages.DELETE_ENTRY;

  private formModel = signal<IndividualPeriodFormModel>({ name: '' });
  individualPeriodForm = form(this.formModel, f => {
    debounce(f.name, 300);
  });

  searchTerm = signal('');
  private individualPeriodsView = signal<IIndividualPeriod[]>([]);

  filteredIndividualPeriods = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const list = this.individualPeriodsView();
    if (!term) return list;
    return list.filter(p => (p.name ?? '').toLowerCase().includes(term));
  });

  private syncIndividualPeriodsView(): void {
    this.individualPeriodsView.set([...this.dataManagementIndividualPeriodService.individualPeriods]);
  }

  get rows(): IPeriod[] {
    return this.editingIndividualPeriod?.periods ?? [];
  }

  private isReadEffect = effect(() => {
    if (this.dataManagementIndividualPeriodService.isRead()) {
      this.syncIndividualPeriodsView();
      this.cdr.markForCheck();
    }
  });

  async ngOnInit(): Promise<void> {
    try {
      await this.dataManagementIndividualPeriodService.init();
      this.syncIndividualPeriodsView();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error initializing individual periods:', error);
    }
  }

  ngAfterViewInit(): void {
    deleteConfirmations(this.modalService, 'individual-periods')
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => {
        this.deleteIndividualPeriod(id);
        this.modalService.componentContext = '';
        this.modalService.Filing = '';
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClickAdd(): void {
    this.editingIndividualPeriod = this.dataManagementIndividualPeriodService.createIndividualPeriod();
    this.formModel.set({ name: '' });
    this.originalIndividualPeriod = null;
    this.isNewIndividualPeriod = true;

    setTimeout(() => {
      this.ngbModal.open(this.periodModal(), {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  onClickEdit(period: IIndividualPeriod): void {
    const clonedPeriod = cloneObject<IIndividualPeriod>(period);

    this.editingIndividualPeriod = clonedPeriod;
    this.formModel.set({ name: clonedPeriod.name });
    this.originalIndividualPeriod = period;
    this.isNewIndividualPeriod = false;

    this.ngbModal.open(this.periodModal(), {
      ariaLabelledBy: 'modal-title',
      size: 'lg',
    });
  }

  openDeleteIndividualPeriod(period: IIndividualPeriod): void {
    if (period.id) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'individual-periods';
      this.modalService.Filing = period.id;
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private async deleteIndividualPeriod(id: string): Promise<void> {
    try {
      await this.dataManagementIndividualPeriodService.deleteIndividualPeriod(id);
      this.syncIndividualPeriodsView();
    } catch (error) {
      console.error('Error deleting individual period:', error);
    }
  }

  addRow(): void {
    if (!this.editingIndividualPeriod) return;
    this.editingIndividualPeriod.periods = [...this.editingIndividualPeriod.periods, new Period()];
    this.cdr.markForCheck();
  }

  removeRow(index: number): void {
    if (!this.editingIndividualPeriod) return;
    this.editingIndividualPeriod.periods = this.editingIndividualPeriod.periods.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  onFromDateChange(index: number, value: NgbDateStruct | null | undefined): void {
    const row = this.rows[index];
    if (!row) return;
    const date = transformNgbDateStructToDate(value ?? undefined);
    if (date) {
      row.fromDate = date;
    }
  }

  onUntilDateChange(index: number, value: NgbDateStruct | null | undefined): void {
    const row = this.rows[index];
    if (!row) return;
    row.untilDate = value ? transformNgbDateStructToDate(value) : undefined;
  }

  onFullHoursChange(index: number, value: number): void {
    const row = this.rows[index];
    if (!row) return;
    row.fullHours = value;
  }

  toNgbDate(date: Date | undefined): NgbDateStruct | undefined {
    return transformDateToNgbDateStruct(date);
  }

  async onSaveModal(modal: { close: () => void }): Promise<void> {
    const success = await this.saveIndividualPeriod();
    if (success) {
      modal.close();
    }
  }

  private applyFormToEditingPeriod(): void {
    if (!this.editingIndividualPeriod) return;
    this.editingIndividualPeriod.name = this.formModel().name;
  }

  isFormValid(): boolean {
    if (!this.editingIndividualPeriod) return false;
    this.applyFormToEditingPeriod();
    return this.dataManagementIndividualPeriodService.validateIndividualPeriod(
      this.editingIndividualPeriod
    ).length === 0;
  }

  getValidationErrors(): string[] {
    if (!this.editingIndividualPeriod) return [];
    this.applyFormToEditingPeriod();
    return this.dataManagementIndividualPeriodService.validateIndividualPeriod(
      this.editingIndividualPeriod
    );
  }

  private async saveIndividualPeriod(): Promise<boolean> {
    if (!this.editingIndividualPeriod || this.isSaving) {
      return false;
    }

    this.applyFormToEditingPeriod();

    if (!this.isFormValid()) {
      return false;
    }

    this.isSaving = true;

    try {
      if (this.originalIndividualPeriod) {
        Object.assign(this.originalIndividualPeriod, this.editingIndividualPeriod);
        const success = await this.dataManagementIndividualPeriodService.saveExistingIndividualPeriod(
          this.originalIndividualPeriod
        );
        this.syncIndividualPeriodsView();
        return success;
      }

      const success = await this.dataManagementIndividualPeriodService.saveExistingIndividualPeriod(
        this.editingIndividualPeriod
      );

      if (success) {
        this.originalIndividualPeriod = this.editingIndividualPeriod;
        this.isNewIndividualPeriod = false;
      }

      this.syncIndividualPeriodsView();
      return success;
    } catch (error) {
      console.error('Error saving individual period:', error);
      return false;
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }
}
