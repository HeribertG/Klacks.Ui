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

  async ngOnInit(): Promise<void> {
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
}
