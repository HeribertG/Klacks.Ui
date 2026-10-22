// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Remembers per browser whether the shift editor runs in complex mode, stored as the text 'complex' or 'simple'.
 */

import { inject, Injectable } from '@angular/core';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

const COMPLEX_MODE_VALUE = 'complex';
const SIMPLE_MODE_VALUE = 'simple';

@Injectable({ providedIn: 'root' })
export class ShiftEditModeService {
  private localStorageService = inject(LocalStorageService);

  isComplex(): boolean {
    return this.localStorageService.get(StorageKeys.SHIFT_EDIT_MODE) === COMPLEX_MODE_VALUE;
  }

  setComplex(complex: boolean): void {
    this.localStorageService.set(StorageKeys.SHIFT_EDIT_MODE, complex ? COMPLEX_MODE_VALUE : SIMPLE_MODE_VALUE);
  }
}
