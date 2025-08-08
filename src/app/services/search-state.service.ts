import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SearchStateService {
  private _restoreSearch = signal('');

  setRestoreSearch(value: string): void {
    this._restoreSearch.set(value);
  }

  getRestoreSearch(): string {
    return this._restoreSearch();
  }

  clearRestoreSearch(): void {
    this._restoreSearch.set('');
  }
}