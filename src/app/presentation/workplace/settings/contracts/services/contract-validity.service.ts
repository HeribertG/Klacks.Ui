// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Validity period (valid from / valid until) of the contract dialog.
 * @param value - Date picked in the date input, null or undefined when the input was cleared
 */

import { inject, Injectable } from '@angular/core';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

import { transformNgbDateStructToDate } from 'src/app/presentation/helpers/ngb-date.helper';
import { ContractEditorStateService } from './contract-editor-state.service';

@Injectable()
export class ContractValidityService {
  private readonly state = inject(ContractEditorStateService);

  onValidFromChange(value: NgbDateStruct | null | undefined): void {
    this.state.validFrom.set(value);
    if (this.state.editingContract && value) {
      const date = transformNgbDateStructToDate(value);
      if (date) {
        this.state.editingContract.validFrom = date;
      }
    }
  }

  onValidUntilChange(value: NgbDateStruct | null | undefined): void {
    this.state.validUntil.set(value);
    if (this.state.editingContract) {
      this.state.editingContract.validUntil = value
        ? transformNgbDateStructToDate(value)
        : undefined;
    }
  }
}
