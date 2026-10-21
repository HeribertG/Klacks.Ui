// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Settings card listing the contracts, with the dialog that creates and edits a contract.
 * @param refreshableEntities - Entity tokens Klacksy refreshes this card for
 * @param contractModal - Template of the contract dialog
 * @param containerBox - Row container that scrolls to a newly saved contract
 */

import {
  Component, ChangeDetectionStrategy,
  ElementRef,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  viewChild,
  TemplateRef,
} from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { FormField } from '@angular/forms/signals';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { Subject } from 'rxjs';

import { ContractHeaderComponent } from './contract-header/contract-header.component';
import { ContractRowComponent } from './contract-row/contract-row.component';
import { ContractHoursConfigComponent } from './contract-hours-config/contract-hours-config.component';
import { ContractRatesConfigComponent } from './contract-rates-config/contract-rates-config.component';
import { ContractWorkPatternComponent } from './contract-work-pattern/contract-work-pattern.component';
import { ContractPaymentIntervalComponent } from './contract-payment-interval/contract-payment-interval.component';
import { ContractAssignmentsComponent } from './contract-assignments/contract-assignments.component';
import { ContractEditorStateService } from './services/contract-editor-state.service';
import { ContractHoursService } from './services/contract-hours.service';
import { ContractValidityService } from './services/contract-validity.service';
import { ContractPaymentService } from './services/contract-payment.service';
import { ContractAssignmentService } from './services/contract-assignment.service';
import { ContractShiftWorkService } from './services/contract-shift-work.service';
import { ContractsListService } from './services/contracts-list.service';
import { ContractEditorSessionService } from './services/contract-editor-session.service';
import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { IRefreshable } from 'src/app/domain/interfaces/refreshable.interface';
import { DataRefreshRegistry } from 'src/app/application/services/data-refresh-registry.service';
import { RefreshEntityTokens } from 'src/app/domain/constants/refresh-entity-tokens.constants';

@Component({
  selector: 'app-contracts',
  templateUrl: './contracts.component.html',
  styleUrls: ['./contracts.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    FormField,
    SpinnerModule,
    ContractHeaderComponent,
    ContractRowComponent,
    ContractHoursConfigComponent,
    ContractRatesConfigComponent,
    ContractWorkPatternComponent,
    ContractPaymentIntervalComponent,
    ContractAssignmentsComponent,
    DateInputComponent,
    SettingsListCardComponent,
  ],
  providers: [
    ContractEditorStateService,
    ContractHoursService,
    ContractValidityService,
    ContractPaymentService,
    ContractAssignmentService,
    ContractShiftWorkService,
    ContractsListService,
    ContractEditorSessionService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractsComponent implements OnInit, AfterViewInit, OnDestroy, IRefreshable {
  public readonly refreshableEntities = RefreshEntityTokens.CONTRACT;
  readonly contractModal = viewChild.required<TemplateRef<unknown>>('contractModal');
  readonly containerBox = viewChild<ElementRef>('containerBox');

  protected readonly dataManagementContractService = inject(DataManagementContractService);
  protected readonly state = inject(ContractEditorStateService);
  protected readonly validity = inject(ContractValidityService);
  protected readonly list = inject(ContractsListService);
  protected readonly session = inject(ContractEditorSessionService);
  private readonly hours = inject(ContractHoursService);
  private readonly refreshRegistry = inject(DataRefreshRegistry);
  private unregisterRefresh?: () => void;
  private readonly destroy$ = new Subject<void>();

  constructor() {
    this.state.connect();
    this.list.connect();
    this.session.bind({ contractModal: this.contractModal, containerBox: this.containerBox });
  }

  async ngOnInit(): Promise<void> {
    await this.list.initialize();
    await this.hours.loadCompanyMonthlyHours();
  }

  ngAfterViewInit(): void {
    this.list.watchDeleteConfirmations(this.destroy$);
    this.unregisterRefresh = this.refreshRegistry.register(this);
  }

  ngOnDestroy(): void {
    this.unregisterRefresh?.();
    this.destroy$.next();
    this.destroy$.complete();
  }

  reload(): void {
    this.list.reload();
  }
}
