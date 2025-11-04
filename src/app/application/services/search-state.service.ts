import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SearchStateService {
  private _restoreSearch = signal('');
  private _containerTemplateSearch = signal('');

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

  setContainerTemplateSearch(value: string): void {
    this._containerTemplateSearch.set(value);
  }

  clearContainerTemplateSearch(): void {
    this._containerTemplateSearch.set('');
  }
}