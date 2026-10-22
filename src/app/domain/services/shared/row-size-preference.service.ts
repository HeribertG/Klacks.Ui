// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Remembers per browser how many rows a list shows, stored as numeric text under a key chosen by the caller.
 * AUTOMATIC_ROW_SIZE (-1) means "fit the rows to the available height".
 * @param storageKey - Storage key of the list whose row size is read or written
 * @param rowSize - Number of rows, or AUTOMATIC_ROW_SIZE
 */

import { inject, Injectable } from '@angular/core';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

@Injectable({ providedIn: 'root' })
export class RowSizePreferenceService {
  private localStorageService = inject(LocalStorageService);

  read(storageKey: string): number | null {
    const stored = this.localStorageService.get(storageKey);
    if (stored && RowSizePreferenceService.isNumericText(stored)) {
      return +stored;
    }
    return null;
  }

  save(storageKey: string, rowSize: number): void {
    this.localStorageService.set(storageKey, rowSize.toString());
  }

  private static isNumericText(value: string): boolean {
    return !Number.isNaN(parseFloat(value)) && Number.isFinite(Number(value));
  }
}
