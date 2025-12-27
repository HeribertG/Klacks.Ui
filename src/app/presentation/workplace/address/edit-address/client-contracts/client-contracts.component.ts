/* eslint-disable @typescript-eslint/consistent-generic-constructors */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  ViewChild,
  OnDestroy,
  OnInit,
  Injector,
  effect,
  runInInjectionContext,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { faCalendar, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { NgbModule, NgbTooltipModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { IContract } from 'src/app/domain/models/contract-class';
import { IClientContract } from 'src/app/domain/models/client-class';
import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';
import { ButtonNewComponent } from 'src/app/presentation/shared/button-new/button-new.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { transformNgbDateStructToDate } from 'src/app/shared/helpers/ngb-date.helper';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';

@Component({
  selector: 'app-client-contracts',
  templateUrl: './client-contracts.component.html',
  styleUrls: ['./client-contracts.component.scss'],
  standalone: true,
  imports: [
    IconAngleDownComponent,
    CommonModule,
    FormsModule,
    TranslateModule,
    FontAwesomeModule,
    NgbModule,
    NgbTooltipModule,
    ButtonNewComponent,
    TrashIconRedComponent,
    ExpandableCardComponent,
  ],
  providers: [TableSortingService],
})
export class ClientContractsComponent
  implements AfterViewInit, OnDestroy, OnInit
{
  @ViewChild('contractsForm', { static: false }) contractsForm:
    | NgForm
    | undefined;
  @Input() isReadOnly = false;
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public faCalendar = faCalendar;
  public faPlus = faPlus;
  public faTimes = faTimes;
  public objectForUnsubscribe: any;
  public contracts: IContract[] = [];
  public sortedContracts: IClientContract[] = [];
  public contractValidationState: Map<number, boolean | undefined> = new Map();
  public contractFromDateValidationState: Map<number, boolean | undefined> =
    new Map();
  public hasAtLeastOneActive = true;
  public hasValidContracts = false;

  public authorizationService = inject(AuthorizationService);
  public dataManagementClientService = inject(DataManagementClientService);
  public contractService = inject(DataManagementContractService);
  public sortingService = inject(TableSortingService);

  private injector = inject(Injector);

  async ngOnInit(): Promise<void> {
    this.sortingService.initialize({
      columns: ['contract', 'fromDate', 'untilDate', 'active'],
      defaultOrderBy: 'contract',
      defaultSortOrder: 'asc',
      useThreeWaySort: true
    });

    this.readSignals();
    await this.loadContracts();
  }

  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.contractsForm!.valueChanges!.subscribe(
      () => {
        if (this.contractsForm!.dirty === true) {
          setTimeout(() => this.isChangingEvent.emit(true), 100);
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
  }

  async loadContracts(): Promise<void> {
    this.contracts = await this.contractService.readContracts();
  }

  isDisabled(): boolean {
    return (
      this.isReadOnly ||
      this.dataManagementClientService.editClientDeleted() ||
      !this.authorizationService.isAdmin
    );
  }

  getMinDate(): NgbDateStruct {
    const client = this.dataManagementClientService.editClient();
    return client?.membership?.internalValidFrom || { year: 1900, month: 1, day: 1 };
  }

  addContract(): void {
    this.dataManagementClientService.addContract();
    this.isChangingEvent.emit(true);
  }

  removeContract(contract: IClientContract): void {
    const currentClient = this.dataManagementClientService.editClient();
    if (!currentClient?.clientContracts) return;

    const index = currentClient.clientContracts.findIndex(c => c === contract);
    if (index > -1) {
      currentClient.clientContracts.splice(index, 1);
      this.dataManagementClientService.clientEditService.editClient.update((c) => ({ ...c! }));
      this.isChangingEvent.emit(true);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  onActiveChange(changedContract: IClientContract): void {
    const currentClient = this.dataManagementClientService.editClient();
    if (!currentClient?.clientContracts) return;

    if (changedContract.isActive) {
      currentClient.clientContracts.forEach((contract) => {
        if (contract !== changedContract) {
          contract.isActive = false;
        }
      });
    }

    this.dataManagementClientService.clientEditService.editClient.update((c) => ({ ...c! }));
    this.isChangingEvent.emit(true);
  }

  sortContracts(): void {
    const currentClient = this.dataManagementClientService.editClient();
    if (!currentClient?.clientContracts) {
      this.sortedContracts = [];
      return;
    }

    const orderBy = this.sortingService.getCurrentOrderBy();
    const sortOrder = this.sortingService.getCurrentSortOrder();

    this.sortedContracts = [...currentClient.clientContracts].sort((a, b) => {
      let compareValue = 0;

      if (orderBy === 'contract') {
        const aName = this.getContractName(a.contractId);
        const bName = this.getContractName(b.contractId);
        compareValue = (aName || '').localeCompare(bName || '');
      } else if (orderBy === 'fromDate') {
        const aDate = a.fromDate ? new Date(a.fromDate).getTime() : 0;
        const bDate = b.fromDate ? new Date(b.fromDate).getTime() : 0;
        compareValue = aDate - bDate;
      } else if (orderBy === 'untilDate') {
        const aDate = a.untilDate ? new Date(a.untilDate).getTime() : 0;
        const bDate = b.untilDate ? new Date(b.untilDate).getTime() : 0;
        compareValue = aDate - bDate;
      } else if (orderBy === 'active') {
        const aActive = a.isActive ? 1 : 0;
        const bActive = b.isActive ? 1 : 0;
        compareValue = aActive - bActive;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  }

  private getContractName(contractId?: string): string {
    if (!contractId) return '';
    const contract = this.contracts.find((c) => c.id === contractId);
    return contract?.name || '';
  }

  onClickHeader(orderBy: string): void {
    this.sortingService.onHeaderClick(orderBy, () => this.sortContracts());
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const client = this.dataManagementClientService.editClient();
        if (client?.clientContracts) {
          this.sortContracts();
          this.calcValidation();
        }
      });
    });
  }

  public calcValidation(): void {
    const client = this.dataManagementClientService.editClient();
    if (!client || !client.clientContracts) {
      return;
    }

    this.contractValidationState.clear();
    this.contractFromDateValidationState.clear();

    client.clientContracts.forEach((contract, index) => {
      const fromDate = transformNgbDateStructToDate(contract.internalFromDate);

      if (!fromDate) {
        this.contractFromDateValidationState.set(index, false);
      } else {
        this.contractFromDateValidationState.set(index, true);
      }

      if (!contract.internalUntilDate) {
        this.contractValidationState.set(index, undefined);
      } else {
        const untilDate = transformNgbDateStructToDate(
          contract.internalUntilDate
        );

        if (!fromDate || !untilDate) {
          this.contractValidationState.set(index, false);
        } else {
          const isValid = fromDate <= untilDate;
          this.contractValidationState.set(index, isValid);
        }
      }
    });

    const validContracts = client.clientContracts.filter(
      (c) => c.contractId && c.contractId !== ''
    );

    this.hasValidContracts = validContracts.length > 0;
    this.hasAtLeastOneActive = validContracts.some((c) => c.isActive);
  }

  isContractDateValid(index: number): boolean | undefined {
    return this.contractValidationState.get(index);
  }

  isContractFromDateValid(index: number): boolean | undefined {
    return this.contractFromDateValidationState.get(index);
  }
}
