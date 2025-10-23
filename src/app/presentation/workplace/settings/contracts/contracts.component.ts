/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  ElementRef,
  inject,
  OnInit,
  OnDestroy,
  ViewChild,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { Subject } from 'rxjs';

import { ContractHeaderComponent } from './contract-header/contract-header.component';
import { ContractRowComponent } from './contract-row/contract-row.component';
import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';
import { IContract } from 'src/app/domain/models/contract-class';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { cloneObject } from 'src/app/domain/helpers/object-helpers';

@Component({
  selector: 'app-contracts',
  templateUrl: './contracts.component.html',
  styleUrls: ['./contracts.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
    ContractHeaderComponent,
    ContractRowComponent,
    TimeInputComponent,
    DateInputComponent,
  ],
})
export class ContractsComponent implements OnInit, OnDestroy {
  @ViewChild('contractModal', { read: TemplateRef })
  contractModal!: TemplateRef<any>;
  @ViewChild('contractForm') contractForm!: NgForm;
  @ViewChild('containerBox') containerBox?: ElementRef;

  public translate = inject(TranslateService);
  public dataManagementContractService = inject(DataManagementContractService);
  private modalService = inject(NgbModal);

  public editingContract: IContract | null = null;
  private originalContract: IContract | null = null;
  private isNewContract = false;
  private isSaving = false;
  private destroy$ = new Subject<void>();

  async ngOnInit(): Promise<void> {
    try {
      await this.dataManagementContractService.init();
    } catch (error) {
      console.error('Error initializing contracts:', error);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClickAdd(): void {
    this.editingContract = this.dataManagementContractService.createContract();

    this.originalContract = null;
    this.isNewContract = true;

    setTimeout(() => {
      this.modalService.open(this.contractModal, {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  onClickEdit(contract: IContract): void {
    const clonedContract = cloneObject<IContract>(contract);
    this.dataManagementContractService.prepareContractForEdit(clonedContract);

    this.editingContract = clonedContract;
    this.originalContract = contract;
    this.isNewContract = false;

    this.modalService.open(this.contractModal, {
      ariaLabelledBy: 'modal-title',
      size: 'lg',
    });
  }

  async onClickDelete(index: number): Promise<void> {
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
