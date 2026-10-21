// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Work days and tri-state shift-work rows of the contract dialog.
 * @param contract - Contract being edited; the workday checkboxes write straight into it
 * @param shiftWork - Tri-state shift-work handlers
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { IContract } from 'src/app/domain/models/contract/contract.interface';
import { ContractShiftWorkService } from '../services/contract-shift-work.service';

@Component({
  selector: 'app-contract-work-pattern',
  templateUrl: './contract-work-pattern.component.html',
  styleUrls: ['./contract-work-pattern.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractWorkPatternComponent {
  readonly contract = input.required<IContract>();

  protected readonly shiftWork = inject(ContractShiftWorkService);
}
