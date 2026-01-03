/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  ElementRef,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  TemplateRef,
} from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { Subject, takeUntil } from 'rxjs';

import { ContractHeaderComponent } from './contract-header/contract-header.component';
import { ContractRowComponent } from './contract-row/contract-row.component';
import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';
import { IContract } from 'src/app/domain/models/contract-class';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { ChooseCalendarComponent } from 'src/app/presentation/icons/choose-calendar.component';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { OwnTime } from 'src/app/domain/models/schedule-class';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { transformDateToNgbDateStruct, transformNgbDateStructToDate } from 'src/app/shared/helpers/ngb-date.helper';
import { transformNumberToOwnTime, transformOwnTimeToNumber } from 'src/app/domain/helpers/own-time.helper';

interface ContractFormViewModel {
  internalGuaranteedHours: OwnTime;
  internalMinimumHours: OwnTime;
  internalMaximumHours: OwnTime;
  internalFullTime: OwnTime;
  internalValidFrom: NgbDateStruct | undefined;
  internalValidUntil: NgbDateStruct | undefined;
}

@Component({
  selector: 'app-contracts',
  templateUrl: './contracts.component.html',
  styleUrls: ['./contracts.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
    ContractHeaderComponent,
    ContractRowComponent,
    TimeInputComponent,
    DateInputComponent,
    ChooseCalendarComponent
],
})
export class ContractsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('contractModal', { read: TemplateRef })
  contractModal!: TemplateRef<any>;
  @ViewChild('contractForm') contractForm!: NgForm;
  @ViewChild('containerBox') containerBox?: ElementRef;

  public translate = inject(TranslateService);
  public dataManagementContractService = inject(DataManagementContractService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);

  public editingContract: IContract | null = null;
  public contractForm_: ContractFormViewModel | null = null;
  private originalContract: IContract | null = null;
  private isNewContract = false;
  private isSaving = false;
  private destroy$ = new Subject<void>();

  message = MessageLibrary.DELETE_ENTRY;

  private createViewModel(contract: IContract): ContractFormViewModel {
    return {
      internalGuaranteedHours: transformNumberToOwnTime(contract.guaranteedHours ?? 0, true),
      internalMinimumHours: transformNumberToOwnTime(contract.minimumHours ?? 0, true),
      internalMaximumHours: transformNumberToOwnTime(contract.maximumHours ?? 0, true),
      internalFullTime: transformNumberToOwnTime(contract.fullTime ?? 0, true),
      internalValidFrom: contract.validFrom ? transformDateToNgbDateStruct(contract.validFrom) : undefined,
      internalValidUntil: contract.validUntil ? transformDateToNgbDateStruct(contract.validUntil) : undefined,
    };
  }

  private applyViewModelToContract(): void {
    if (!this.editingContract || !this.contractForm_) return;
    this.editingContract.guaranteedHours = transformOwnTimeToNumber(this.contractForm_.internalGuaranteedHours);
    this.editingContract.minimumHours = transformOwnTimeToNumber(this.contractForm_.internalMinimumHours);
    this.editingContract.maximumHours = transformOwnTimeToNumber(this.contractForm_.internalMaximumHours);
    this.editingContract.fullTime = transformOwnTimeToNumber(this.contractForm_.internalFullTime);
    if (this.contractForm_.internalValidFrom) {
      const validFrom = transformNgbDateStructToDate(this.contractForm_.internalValidFrom);
      if (validFrom) {
        this.editingContract.validFrom = validFrom;
      }
    }
    this.editingContract.validUntil = this.contractForm_.internalValidUntil
      ? transformNgbDateStructToDate(this.contractForm_.internalValidUntil)
      : undefined;
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.dataManagementContractService.init();
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
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClickAdd(): void {
    this.editingContract = this.dataManagementContractService.createContract();
    this.contractForm_ = this.createViewModel(this.editingContract);

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
    this.contractForm_ = this.createViewModel(clonedContract);
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
    if (!this.editingContract || !this.isFormValid() || this.isSaving) {
      return;
    }

    this.applyViewModelToContract();
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

      if (this.contractForm) {
        this.contractForm.form.markAsPristine();
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
    }
  }

  onCalendarSelectionChange(calendarId: string): void {
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
    if (!this.editingContract?.calendarSelectionId) {
      return this.translate.instant('setting.contract.noCalendar');
    }
    const calendar = this.dataManagementContractService.availableCalendars.find(
      (cal) => cal.id === this.editingContract?.calendarSelectionId
    );
    return calendar?.name || this.translate.instant('setting.contract.noCalendar');
  }

  isFormValid(): boolean {
    return this.editingContract
      ? this.dataManagementContractService.validateContract(
          this.editingContract
        ).length === 0
      : false;
  }

  getValidationErrors(): string[] {
    return this.editingContract
      ? this.dataManagementContractService.validateContract(
          this.editingContract
        )
      : [];
  }
}
