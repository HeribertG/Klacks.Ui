/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  EventEmitter,
  Output,
  inject,
  OnInit,
  ViewChild,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';

import { ContractHeaderComponent } from './contract-header/contract-header.component';
import { ContractRowComponent } from './contract-row/contract-row.component';
import { DataManagementContractService } from 'src/app/domain/services/data-management-contract.service';
import { IContract, Contract } from 'src/app/domain/models/contract-class';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { cloneObject } from 'src/app/domain/helpers/object-helpers';
import { OwnTime } from 'src/app/domain/models/schedule-class';

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
export class ContractsComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();
  @ViewChild('contractModal', { read: TemplateRef })
  contractModal!: TemplateRef<any>;

  public translate = inject(TranslateService);
  public dataManagementContractService = inject(DataManagementContractService);
  private modalService = inject(NgbModal);

  public editingContract: IContract | null = null;
  private originalContract: IContract | null = null;

  async ngOnInit(): Promise<void> {
    try {
      await this.dataManagementContractService.init();
    } catch (error) {
      console.error('Error initializing contracts:', error);
    }
  }

  onClickAdd(): void {
    this.editingContract = this.dataManagementContractService.createContract();

    this.originalContract = null;

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

          this.onIsChanging(true);
        } catch (error) {
          console.error('Error deleting contract:', error);
        }
      }
    }
  }

  onIsChanging(value: boolean): void {
    this.isChangingEvent.emit(value);
  }

  async onSave(modal: any): Promise<void> {
    if (!this.editingContract || !this.isFormValid()) {
      return;
    }

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
      }

      this.onIsChanging(true);
      modal.close();
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
      } else {
        this.editingContract.calendarSelection = undefined;
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
