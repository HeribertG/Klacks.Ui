// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal } from '@angular/core';

export interface ContainerTemplateSearchState {
  searchString: string;
  includeAddress: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SearchStateService {
  private _restoreSearch = signal('');
  private _containerTemplateSearch = signal('');
  private _containerTemplateIncludeAddress = signal(false);

  setRestoreSearch(value: string): void {
    this._restoreSearch.set(value);
  }

  getRestoreSearch(): string {
    return this._restoreSearch();
  }

  clearRestoreSearch(): void {
    this._restoreSearch.set('');
  }

  get containerTemplateSearch() {
    return this._containerTemplateSearch.asReadonly();
  }

  get containerTemplateIncludeAddress() {
    return this._containerTemplateIncludeAddress.asReadonly();
  }

  setContainerTemplateSearch(value: string, includeAddress = false): void {
    this._containerTemplateSearch.set(value);
    this._containerTemplateIncludeAddress.set(includeAddress);
  }

  clearContainerTemplateSearch(): void {
    this._containerTemplateSearch.set('');
    this._containerTemplateIncludeAddress.set(false);
  }
}