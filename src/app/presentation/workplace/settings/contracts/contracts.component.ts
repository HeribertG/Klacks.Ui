import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';

import { ContractHeaderComponent } from './contract-header/contract-header.component';
import { ContractRowComponent } from './contract-row/contract-row.component';
import { DataManagementContractService } from 'src/app/domain/services/data-management-contract.service';

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
  ],
})
export class ContractsComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public translate = inject(TranslateService);
  public dataManagementContractService = inject(DataManagementContractService);

  async ngOnInit(): Promise<void> {
    try {
      await this.dataManagementContractService.init();
    } catch (error) {
      console.error('Error initializing contracts:', error);
    }
  }

  onClickAdd(): void {
    this.dataManagementContractService.createNewContract();
    this.onIsChanging(true);
  }

  async onClickDelete(index: number): Promise<void> {
    const contracts = this.dataManagementContractService.contracts;

    if (index >= 0 && index < contracts.length) {
      const contract = contracts[index];

      if (contract && !contract.internal) {
        try {
          if (contract.id) {
            // Existing contract - delete from backend
            await this.dataManagementContractService.deleteContract(
              contract.id
            );
          } else {
            // New contract - just remove from array
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
}
