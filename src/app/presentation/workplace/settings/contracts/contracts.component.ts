// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component, ChangeDetectionStrategy,
  ElementRef,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  TemplateRef,
  signal,
  computed,
  effect,
  ChangeDetectorRef,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, debounce } from '@angular/forms/signals';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { Subject, takeUntil } from 'rxjs';

import { ContractHeaderComponent } from './contract-header/contract-header.component';
import { ContractRowComponent } from './contract-row/contract-row.component';
import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';
import { IContract, PaymentInterval } from 'src/app/domain/models/contract/contract-class';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { ChooseCalendarComponent } from 'src/app/presentation/icons/choose-calendar.component';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { transformDateToNgbDateStruct, transformNgbDateStructToDate } from 'src/app/shared/helpers/ngb-date.helper';
import { transformNumberToOwnTime, transformOwnTimeToNumber } from 'src/app/domain/helpers/own-time.helper';
import { IRefreshable } from 'src/app/domain/interfaces/manageable.interface';
import { DataRefreshRegistry } from 'src/app/application/services/data-refresh-registry.service';
import { RefreshEntityTokens } from 'src/app/domain/constants/refresh-entity-tokens.constants';

interface ContractFormModel {
  name: string;
  nightRate: number;
  holidayRate: number;
  saRate: number;
  soRate: number;
}

@Component({
  selector: 'app-contracts',
  templateUrl: './contracts.component.html',
  styleUrls: ['./contracts.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    FormField,
    NgbModule,
    SpinnerModule,
    ContractHeaderComponent,
    ContractRowComponent,
    TimeInputComponent,
    DateInputComponent,
    ChooseCalendarComponent,
    SettingsListCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractsComponent implements OnInit, AfterViewInit, OnDestroy, IRefreshable {
  public readonly refreshableEntities = RefreshEntityTokens.CONTRACT;
  @ViewChild('contractModal', { read: TemplateRef })
  contractModal!: TemplateRef<any>;
  @ViewChild('containerBox') containerBox?: ElementRef;

  public translate = inject(TranslateService);
  public dataManagementContractService = inject(DataManagementContractService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);
  private refreshRegistry = inject(DataRefreshRegistry);
  private unregisterRefresh?: () => void;

  public editingContract: IContract | null = null;
  public originalContract: IContract | null = null;
  public isNewContract = false;
  private isSaving = false;
  private destroy$ = new Subject<void>();

  private formModel = signal<ContractFormModel>({
    name: '',
    nightRate: 0,
    holidayRate: 0,
    saRate: 0,
    soRate: 0,
  });

  contractForm = form(this.formModel, f => {
    debounce(f.name, 300);
  });

  private rateClampEffect = effect(() => {
    const current = this.formModel();
    const clamped = {
      ...current,
      nightRate: Math.max(0, Math.min(100, current.nightRate)),
      holidayRate: Math.max(0, Math.min(100, current.holidayRate)),
      saRate: Math.max(0, Math.min(100, current.saRate)),
      soRate: Math.max(0, Math.min(100, current.soRate)),
    };
    if (
      clamped.nightRate !== current.nightRate ||
      clamped.holidayRate !== current.holidayRate ||
      clamped.saRate !== current.saRate ||
      clamped.soRate !== current.soRate
    ) {
      this.formModel.set(clamped);
    }
  });

  guaranteedHours = signal<OwnTime>(OwnTime.forDuration('00', '00'));
  minimumHours = signal<OwnTime>(OwnTime.forDuration('00', '00'));
  maximumHours = signal<OwnTime>(OwnTime.forDuration('00', '00'));
  fullTime = signal<OwnTime>(OwnTime.forDuration('00', '00'));
  validFrom = signal<NgbDateStruct | null | undefined>(undefined);
  validUntil = signal<NgbDateStruct | null | undefined>(undefined);
  calendarSelectionId = signal<string | undefined>(undefined);
  schedulingRuleId = signal<string | undefined>(undefined);
  paymentInterval = signal<PaymentInterval>(PaymentInterval.Monthly);

  paymentIntervalOptions = [
    PaymentInterval.Weekly,
    PaymentInterval.Biweekly,
    PaymentInterval.Monthly,
    PaymentInterval.Individual,
  ];

  private paymentIntervalLabelKeys: Record<PaymentInterval, string> = {
    [PaymentInterval.Weekly]: 'settings.work.payment-weekly',
    [PaymentInterval.Biweekly]: 'settings.work.payment-biweekly',
    [PaymentInterval.Monthly]: 'settings.work.payment-monthly',
    [PaymentInterval.Individual]: 'settings.work.payment-individual',
  };

  searchTerm = signal('');

  private contractsView = signal<IContract[]>([]);

  filteredContracts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const list = this.contractsView();
    if (!term) return list;
    return list.filter(c =>
      (c.name ?? '').toLowerCase().includes(term)
    );
  });

  private syncContractsView(): void {
    this.contractsView.set([...this.dataManagementContractService.contracts]);
  }

  message = DomainMessages.DELETE_ENTRY;

  private initFormSignals(contract: IContract): void {
    this.formModel.set({
      name: contract.name || '',
      nightRate: contract.nightRate ?? 0,
      holidayRate: contract.holidayRate ?? 0,
      saRate: contract.saRate ?? 0,
      soRate: contract.soRate ?? 0,
    });
    this.guaranteedHours.set(transformNumberToOwnTime(contract.guaranteedHours ?? 0, true));
    this.minimumHours.set(transformNumberToOwnTime(contract.minimumHours ?? 0, true));
    this.maximumHours.set(transformNumberToOwnTime(contract.maximumHours ?? 0, true));
    this.fullTime.set(transformNumberToOwnTime(contract.fullTime ?? 0, true));
    this.validFrom.set(contract.validFrom ? transformDateToNgbDateStruct(contract.validFrom) : undefined);
    this.validUntil.set(contract.validUntil ? transformDateToNgbDateStruct(contract.validUntil) : undefined);
    this.calendarSelectionId.set(contract.calendarSelectionId);
    this.schedulingRuleId.set(contract.schedulingRuleId);
    this.paymentInterval.set(contract.paymentInterval);
  }

  private applySignalsToContract(): void {
    if (!this.editingContract) return;
    const formData = this.formModel();
    this.editingContract.name = formData.name;
    this.editingContract.nightRate = formData.nightRate;
    this.editingContract.holidayRate = formData.holidayRate;
    this.editingContract.saRate = formData.saRate;
    this.editingContract.soRate = formData.soRate;
    this.editingContract.guaranteedHours = transformOwnTimeToNumber(this.guaranteedHours());
    this.editingContract.minimumHours = transformOwnTimeToNumber(this.minimumHours());
    this.editingContract.maximumHours = transformOwnTimeToNumber(this.maximumHours());
    this.editingContract.fullTime = transformOwnTimeToNumber(this.fullTime());
    const validFromValue = this.validFrom();
    if (validFromValue) {
      const validFromDate = transformNgbDateStructToDate(validFromValue);
      if (validFromDate) {
        this.editingContract.validFrom = validFromDate;
      }
    }
    const validUntilValue = this.validUntil();
    this.editingContract.validUntil = validUntilValue
      ? transformNgbDateStructToDate(validUntilValue)
      : undefined;
    this.editingContract.paymentInterval = this.paymentInterval();
  }

  private isReadEffect = effect(() => {
    if (this.dataManagementContractService.isRead()) {
      this.syncContractsView();
      this.cdr.markForCheck();
    }
  });

  async ngOnInit(): Promise<void> {
    try {
      await this.dataManagementContractService.init();
      this.syncContractsView();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error initializing contracts:', error);
    }
  }

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'contracts'
        ) {
          this.deleteContract(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
          this.cdr.markForCheck();
        }
      });

    this.unregisterRefresh = this.refreshRegistry.register(this);
  }

  ngOnDestroy(): void {
    this.unregisterRefresh?.();
    this.destroy$.next();
    this.destroy$.complete();
  }

  reload(): void {
    this.dataManagementContractService.readContracts().then(() => {
      this.syncContractsView();
      this.cdr.markForCheck();
    });
  }

  onClickAdd(): void {
    this.editingContract = this.dataManagementContractService.createContract();
    this.initFormSignals(this.editingContract);

    this.originalContract = null;
    this.isNewContract = true;

    setTimeout(() => {
      this.ngbModal.open(this.contractModal, {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  onClickEdit(contract: IContract): void {
    const clonedContract = cloneObject<IContract>(contract);
    this.dataManagementContractService.prepareContractForEdit(clonedContract);

    this.editingContract = clonedContract;
    this.initFormSignals(clonedContract);
    this.originalContract = contract;
    this.isNewContract = false;

    this.ngbModal.open(this.contractModal, {
      ariaLabelledBy: 'modal-title',
      size: 'lg',
    });
  }

  openDeleteContract(index: number): void {
    const contracts = this.dataManagementContractService.contracts;
    if (index >= 0 && index < contracts.length) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'contracts';
      this.modalService.Filing = index.toString();
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private async deleteContract(indexStr: string): Promise<void> {
    const index = parseInt(indexStr, 10);
    const contracts = this.dataManagementContractService.contracts;

    if (index >= 0 && index < contracts.length) {
      const contract = contracts[index];

      if (contract) {
        try {
          if (contract.id) {
            await this.dataManagementContractService.deleteContract(
              contract.id
            );
          } else {
            contracts.splice(index, 1);
            this.syncContractsView();
          }
        } catch (error) {
          console.error('Error deleting contract:', error);
        }
      }
    }
  }

  async onSaveModal(modal: any): Promise<void> {
    await this.saveContract();
    modal.close();
  }

  private async saveContract(): Promise<void> {
    if (!this.editingContract || this.isSaving) {
      return;
    }

    this.applySignalsToContract();

    if (!this.isFormValid()) {
      return;
    }

    this.isSaving = true;

    try {
      if (this.originalContract) {
        Object.assign(this.originalContract, this.editingContract);
        await this.dataManagementContractService.saveExistingContract(
          this.originalContract
        );
      } else {
        this.dataManagementContractService.contracts.push(this.editingContract);
        await this.dataManagementContractService.saveExistingContract(
          this.editingContract
        );
        this.originalContract = this.editingContract;
        this.isNewContract = false;

        if (this.containerBox?.nativeElement) {
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (this.containerBox?.nativeElement) {
                this.containerBox.nativeElement.scrollTop =
                  this.containerBox.nativeElement.scrollHeight;
              }
            }, 100);
          });
        }
      }
    } catch (error) {
      console.error('Error saving contract:', error);

      try {
        await this.dataManagementContractService.readContracts();
      } catch (reloadError) {
        console.error(
          'Error reloading contracts after save error:',
          reloadError
        );
      }
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  onCalendarSelectionChange(calendarId: string): void {
    this.calendarSelectionId.set(calendarId || undefined);
    if (this.editingContract) {
      if (calendarId) {
        const selectedCalendar =
          this.dataManagementContractService.availableCalendars.find(
            (cal) => cal.id === calendarId
          );
        this.editingContract.calendarSelection = selectedCalendar;
        this.editingContract.calendarSelectionId = calendarId;
      } else {
        this.editingContract.calendarSelection = undefined;
        this.editingContract.calendarSelectionId = undefined;
      }
    }
  }

  getSelectedCalendarName(): string {
    const selectedId = this.calendarSelectionId();
    if (!selectedId) {
      return this.translate.instant('setting.contract.noCalendar');
    }
    const calendar = this.dataManagementContractService.availableCalendars.find(
      (cal) => cal.id === selectedId
    );
    return calendar?.name || this.translate.instant('setting.contract.noCalendar');
  }

  onSchedulingRuleSelectionChange(ruleId: string): void {
    this.schedulingRuleId.set(ruleId || undefined);
    if (this.editingContract) {
      this.editingContract.schedulingRuleId = ruleId || undefined;
    }
  }

  getSelectedSchedulingRuleName(): string {
    const selectedId = this.schedulingRuleId();
    if (!selectedId) {
      return this.translate.instant('setting.contract.noSchedulingRule');
    }
    const rule = this.dataManagementContractService.availableSchedulingRules.find(
      (r) => r.id === selectedId
    );
    return rule?.name || this.translate.instant('setting.contract.noSchedulingRule');
  }

  isFormValid(): boolean {
    if (!this.editingContract) return false;
    this.applySignalsToContract();
    return this.dataManagementContractService.validateContract(
      this.editingContract
    ).length === 0;
  }

  getValidationErrors(): string[] {
    if (!this.editingContract) return [];
    this.applySignalsToContract();
    return this.dataManagementContractService.validateContract(
      this.editingContract
    );
  }

  onGuaranteedHoursChange(value: OwnTime): void {
    this.guaranteedHours.set(value);
    if (this.editingContract) {
      this.editingContract.guaranteedHours = transformOwnTimeToNumber(value);
    }
  }

  onMinimumHoursChange(value: OwnTime): void {
    this.minimumHours.set(value);
    if (this.editingContract) {
      this.editingContract.minimumHours = transformOwnTimeToNumber(value);
    }
  }

  onMaximumHoursChange(value: OwnTime): void {
    this.maximumHours.set(value);
    if (this.editingContract) {
      this.editingContract.maximumHours = transformOwnTimeToNumber(value);
    }
  }

  onFullTimeChange(value: OwnTime): void {
    this.fullTime.set(value);
    if (this.editingContract) {
      this.editingContract.fullTime = transformOwnTimeToNumber(value);
    }
  }

  onValidFromChange(value: NgbDateStruct | null | undefined): void {
    this.validFrom.set(value);
    if (this.editingContract && value) {
      const date = transformNgbDateStructToDate(value);
      if (date) {
        this.editingContract.validFrom = date;
      }
    }
  }

  onPaymentIntervalChange(value: PaymentInterval): void {
    this.paymentInterval.set(value);
    if (this.editingContract) {
      this.editingContract.paymentInterval = value;
    }
  }

  getPaymentIntervalLabel(value?: PaymentInterval): string {
    const interval = value ?? this.paymentInterval();
    return this.translate.instant(this.paymentIntervalLabelKeys[interval]);
  }

  onValidUntilChange(value: NgbDateStruct | null | undefined): void {
    this.validUntil.set(value);
    if (this.editingContract) {
      this.editingContract.validUntil = value
        ? transformNgbDateStructToDate(value)
        : undefined;
    }
  }
}
