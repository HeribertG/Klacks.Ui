// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Payment row of the contract dialog: payment interval, individual period and workload percent.
 * @param individualPeriods - Selectable individual periods; passed in so the row refreshes once they have loaded
 * @param state - Editor state of the contract dialog
 * @param payment - Payment interval, period and percent handlers
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';
import { IIndividualPeriod } from 'src/app/domain/models/scheduling/individual-period.interface';
import { ContractEditorStateService } from '../services/contract-editor-state.service';
import { ContractPaymentService } from '../services/contract-payment.service';

@Component({
  selector: 'app-contract-payment-interval',
  templateUrl: './contract-payment-interval.component.html',
  styleUrls: ['./contract-payment-interval.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormsModule, NgbModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractPaymentIntervalComponent {
  readonly individualPeriods = input.required<IIndividualPeriod[]>();

  protected readonly state = inject(ContractEditorStateService);
  protected readonly payment = inject(ContractPaymentService);
  protected readonly PaymentInterval = PaymentInterval;
}
