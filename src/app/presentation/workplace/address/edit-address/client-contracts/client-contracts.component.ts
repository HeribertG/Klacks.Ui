/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  EventEmitter,
  inject,
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
import { NgbModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { IContract } from 'src/app/domain/models/contract-class';
import { DataManagementContractService } from 'src/app/domain/services/data-management-contract.service';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { ButtonNewComponent } from 'src/app/presentation/shared/button-new/button-new.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { transformNgbDateStructToDate } from 'src/app/domain/helpers/format-helper';

interface HeaderProperties {
  order: number;
}

enum HeaderDirection {
  None = 0,
  Down = 1,
  Up = 2,
}

@Component({
  selector: 'app-client-contracts',
  templateUrl: './client-contracts.component.html',
  styleUrls: ['./client-contracts.component.scss'],
  standalone: true,
  imports: [
    IconAngleRightComponent,
    IconAngleDownComponent,
    CommonModule,
    FormsModule,
    TranslateModule,
    FontAwesomeModule,
    NgbModule,
    NgbTooltipModule,
    ButtonNewComponent,
    TrashIconRedComponent,
  ],
})
export class ClientContractsComponent
  implements AfterViewInit, OnDestroy, OnInit
{
  @ViewChild('contractsForm', { static: false }) contractsForm:
    | NgForm
    | undefined;
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public faCalendar = faCalendar;
  public faPlus = faPlus;
  public faTimes = faTimes;
  public visibleTable = 'inline';
  public objectForUnsubscribe: any;
  public contracts: IContract[] = [];

  public authorizationService = inject(AuthorizationService);
  public dataManagementClientService = inject(DataManagementClientService);
  public contractService = inject(DataManagementContractService);
  private injector = inject(Injector);

  private tmplateArrowDown = '↓';
  private tmplateArrowUp = '↑';

  arrowContract = '';
  arrowFromDate = '';
  arrowUntilDate = '';
  arrowActive = '';

  contractHeader: HeaderProperties = { order: HeaderDirection.None };
  fromDateHeader: HeaderProperties = { order: HeaderDirection.None };
  untilDateHeader: HeaderProperties = { order: HeaderDirection.None };
  activeHeader: HeaderProperties = { order: HeaderDirection.None };

  orderBy = 'contract';
  sortOrder = 'asc';

  public contractValidationState: Map<number, boolean | undefined> = new Map();
  public contractFromDateValidationState: Map<number, boolean | undefined> = new Map();
  public hasAtLeastOneActive = true;

  async ngOnInit(): Promise<void> {
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

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  async loadContracts(): Promise<void> {
    this.contracts = await this.contractService.readContracts();
  }

  isDisabled(): boolean {
    return (
      this.dataManagementClientService.editClientDeleted() ||
      !this.authorizationService.isAuthorised
    );
  }

  addContract(): void {
    this.dataManagementClientService.addContract();
  }

  removeContract(index: number): void {
    this.dataManagementClientService
      .editClient()
      ?.clientContracts.splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  onActiveChange(index: number): void {
    const client = this.dataManagementClientService.editClient();
    if (!client || !client.clientContracts[index]?.isActive) {
      return;
    }

    client.clientContracts.forEach((contract, i) => {
      if (i !== index) {
        contract.isActive = false;
      }
    });
  }

  sortContracts(): void {
    const currentClient = this.dataManagementClientService.editClient();
    if (!currentClient?.clientContracts) return;

    currentClient.clientContracts.sort((a, b) => {
      let compareValue = 0;

      if (this.orderBy === 'contract') {
        const aName = this.getContractName(a.contractId);
        const bName = this.getContractName(b.contractId);
        compareValue = (aName || '').localeCompare(bName || '');
      } else if (this.orderBy === 'fromDate') {
        const aDate = a.fromDate ? new Date(a.fromDate).getTime() : 0;
        const bDate = b.fromDate ? new Date(b.fromDate).getTime() : 0;
        compareValue = aDate - bDate;
      } else if (this.orderBy === 'untilDate') {
        const aDate = a.untilDate ? new Date(a.untilDate).getTime() : 0;
        const bDate = b.untilDate ? new Date(b.untilDate).getTime() : 0;
        compareValue = aDate - bDate;
      } else if (this.orderBy === 'active') {
        const aActive = a.isActive ? 1 : 0;
        const bActive = b.isActive ? 1 : 0;
        compareValue = aActive - bActive;
      }

      return this.sortOrder === 'asc' ? compareValue : -compareValue;
    });
  }

  private getContractName(contractId?: string): string {
    if (!contractId) return '';
    const contract = this.contracts.find((c) => c.id === contractId);
    return contract?.name || '';
  }

  onClickHeader(orderBy: string): void {
    let sortOrder = '';

    if (orderBy === 'contract') {
      this.contractHeader.order = this.toggleHeaderDirection(
        this.contractHeader.order
      );
      sortOrder = this.getSortOrder(this.contractHeader.order);
    } else if (orderBy === 'fromDate') {
      this.fromDateHeader.order = this.toggleHeaderDirection(
        this.fromDateHeader.order
      );
      sortOrder = this.getSortOrder(this.fromDateHeader.order);
    } else if (orderBy === 'untilDate') {
      this.untilDateHeader.order = this.toggleHeaderDirection(
        this.untilDateHeader.order
      );
      sortOrder = this.getSortOrder(this.untilDateHeader.order);
    } else if (orderBy === 'active') {
      this.activeHeader.order = this.toggleHeaderDirection(
        this.activeHeader.order
      );
      sortOrder = this.getSortOrder(this.activeHeader.order);
    }

    this.sort(orderBy, sortOrder);
  }

  private toggleHeaderDirection(current: number): number {
    if (current === HeaderDirection.None) return HeaderDirection.Down;
    if (current === HeaderDirection.Down) return HeaderDirection.Up;
    return HeaderDirection.None;
  }

  private getSortOrder(direction: number): string {
    if (direction === HeaderDirection.Down) return 'asc';
    if (direction === HeaderDirection.Up) return 'desc';
    return '';
  }

  private sort(orderBy: string, sortOrder: string): void {
    this.orderBy = orderBy;
    this.sortOrder = sortOrder;
    this.setHeaderArrowToUndefined();
    this.setDirection(sortOrder, orderBy);
    this.setHeaderArrowTemplate();
    this.sortContracts();
  }

  private setDirection(sortOrder: string, orderBy: string): void {
    if (orderBy === 'contract') {
      if (sortOrder === 'asc') {
        this.contractHeader.order = HeaderDirection.Down;
      } else if (sortOrder === 'desc') {
        this.contractHeader.order = HeaderDirection.Up;
      }
    } else if (orderBy === 'fromDate') {
      if (sortOrder === 'asc') {
        this.fromDateHeader.order = HeaderDirection.Down;
      } else if (sortOrder === 'desc') {
        this.fromDateHeader.order = HeaderDirection.Up;
      }
    } else if (orderBy === 'untilDate') {
      if (sortOrder === 'asc') {
        this.untilDateHeader.order = HeaderDirection.Down;
      } else if (sortOrder === 'desc') {
        this.untilDateHeader.order = HeaderDirection.Up;
      }
    } else if (orderBy === 'active') {
      if (sortOrder === 'asc') {
        this.activeHeader.order = HeaderDirection.Down;
      } else if (sortOrder === 'desc') {
        this.activeHeader.order = HeaderDirection.Up;
      }
    }
  }

  private setHeaderArrowToUndefined(): void {
    this.contractHeader.order = HeaderDirection.None;
    this.fromDateHeader.order = HeaderDirection.None;
    this.untilDateHeader.order = HeaderDirection.None;
    this.activeHeader.order = HeaderDirection.None;
  }

  private setHeaderArrowTemplate(): void {
    this.arrowContract = this.setHeaderArrowTemplateSub(
      this.contractHeader.order
    );
    this.arrowFromDate = this.setHeaderArrowTemplateSub(
      this.fromDateHeader.order
    );
    this.arrowUntilDate = this.setHeaderArrowTemplateSub(
      this.untilDateHeader.order
    );
    this.arrowActive = this.setHeaderArrowTemplateSub(
      this.activeHeader.order
    );
  }

  private setHeaderArrowTemplateSub(order: number): string {
    switch (order) {
      case HeaderDirection.Down:
        return this.tmplateArrowDown;
      case HeaderDirection.Up:
        return this.tmplateArrowUp;
      case HeaderDirection.None:
        return '';
      default:
        return '';
    }
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
        const untilDate = transformNgbDateStructToDate(contract.internalUntilDate);

        if (!fromDate || !untilDate) {
          this.contractValidationState.set(index, false);
        } else {
          const isValid = fromDate <= untilDate;
          this.contractValidationState.set(index, isValid);
        }
      }
    });

    this.hasAtLeastOneActive = client.clientContracts.some((c) => c.isActive);
  }

  isContractDateValid(index: number): boolean | undefined {
    return this.contractValidationState.get(index);
  }

  isContractFromDateValid(index: number): boolean | undefined {
    return this.contractFromDateValidationState.get(index);
  }
}
