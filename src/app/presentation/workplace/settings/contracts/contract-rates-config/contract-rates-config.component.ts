// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Surcharge rate rows of the contract dialog: night, holiday and weekend rates and the night window.
 * @param state - Editor state of the contract dialog whose signal form the inputs are bound to
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';

import { ContractEditorStateService } from '../services/contract-editor-state.service';

@Component({
  selector: 'app-contract-rates-config',
  templateUrl: './contract-rates-config.component.html',
  styleUrls: ['./contract-rates-config.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractRatesConfigComponent {
  protected readonly state = inject(ContractEditorStateService);
}
