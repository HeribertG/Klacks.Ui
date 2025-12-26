import { Injectable, signal } from '@angular/core';

export interface ShowInShiftRequest {
  shiftId: string;
  column: number;
}

@Injectable({
  providedIn: 'root',
})
export class ShowInShiftService {
  private _request = signal<ShowInShiftRequest | null>(null);

  public request = this._request.asReadonly();

  showShift(shiftId: string, column: number): void {
    this._request.set({ shiftId, column });
  }

  clear(): void {
    this._request.set(null);
  }
}
