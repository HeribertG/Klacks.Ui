/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NgbModule,
  NgbModal,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';

import { IContract, Contract } from 'src/app/domain/models/contract-class';
import { DataManagementContractService } from 'src/app/domain/services/data-management-contract.service';

@Component({
  selector: 'app-contract-row',
  templateUrl: './contract-row.component.html',
  styleUrls: ['./contract-row.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    TranslateModule,
    TimeInputComponent,
    DateInputComponent,
  ],
})
export class ContractRowComponent implements OnInit {
  @Input() data: IContract = new Contract();
  @Output() isChangingEvent = new EventEmitter<boolean>();
  @Output() isDeleteEvent = new EventEmitter<void>();

  public translate = inject(TranslateService);
  private modalService = inject(NgbModal);
  public dataManagementContractService = inject(DataManagementContractService);

  async ngOnInit(): Promise<void> {
    // Calendar selections are loaded by the service
  }

  open(content: any): void {
    // Set the current contract in the service
    this.dataManagementContractService.setCurrentContract(this.data);

    this.modalService.open(content, {
      ariaLabelledBy: 'modal-title',
      size: 'lg',
    });
  }

  async onSave(modal: any): Promise<void> {
    try {
      const success = await this.dataManagementContractService.saveContract();

      if (success) {
        // Update the local data reference with the saved contract
        if (this.dataManagementContractService.editContract) {
          Object.assign(this.data, this.dataManagementContractService.editContract);
        }
        this.isChangingEvent.emit(true);
        modal.close();
      }
    } catch (error) {
      console.error('Error saving contract:', error);
    }
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  onTimeInputChange(): void {
    // Time input changes are handled directly by the service's editContract
    // The service will validate and update when save is called
  }

  onCalendarSelectionChange(calendarId: string): void {
    if (this.dataManagementContractService.editContract) {
      if (calendarId) {
        const selectedCalendar = this.dataManagementContractService.availableCalendars.find(
          (cal) => cal.id === calendarId
        );
        this.dataManagementContractService.editContract.calendarSelection = selectedCalendar;
      } else {
        this.dataManagementContractService.editContract.calendarSelection = undefined;
      }
    }
  }

  validateForm(): void {
    // Validation is handled by the service
  }

  isFormValid(): boolean {
    return this.dataManagementContractService.isValid();
  }

}