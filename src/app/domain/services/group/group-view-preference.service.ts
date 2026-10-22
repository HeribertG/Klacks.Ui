// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Remembers per browser whether the group overview shows the grid or the tree, stored as the text 'true' (grid) or
 * 'false' (tree). Without a stored choice the grid is shown.
 */
import { inject, Injectable } from '@angular/core';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

const GRID_VIEW_VALUE = 'true';

@Injectable({ providedIn: 'root' })
export class GroupViewPreferenceService {
  private localStorageService = inject(LocalStorageService);

  isGridView(): boolean {
    const savedViewMode = this.localStorageService.get(StorageKeys.GROUP_VIEW_MODE);
    return savedViewMode === null || savedViewMode === GRID_VIEW_VALUE;
  }

  setGridView(showGrid: boolean): void {
    this.localStorageService.set(StorageKeys.GROUP_VIEW_MODE, showGrid.toString());
  }
}
