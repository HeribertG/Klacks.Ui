// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Hours row of the contract dialog: guaranteed hours with the company fallback, minimum, maximum and full-time hours.
 * @param state - Editor state of the contract dialog provided by the contracts card
 * @param hours - Hour handlers and the inherited company values
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { ContractEditorStateService } from '../services/contract-editor-state.service';
import { ContractHoursService } from '../services/contract-hours.service';

@Component({
  selector: 'app-contract-hours-config',
  templateUrl: './contract-hours-config.component.html',
  styleUrls: ['./contract-hours-config.component.scss'],
  standalone: true,
  imports: [TranslateModule, TimeInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractHoursConfigComponent {
  protected readonly state = inject(ContractEditorStateService);
  protected readonly hours = inject(ContractHoursService);
}
