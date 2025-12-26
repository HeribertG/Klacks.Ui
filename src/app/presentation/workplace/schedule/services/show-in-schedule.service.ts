import { Injectable, signal } from '@angular/core';

export interface ShowInScheduleRequest {
  shiftId: string;
  column: number;
}

@Injectable({
  providedIn: 'root',
})
export class ShowInScheduleService {
  private _request = signal<ShowInScheduleRequest | null>(null);

  public request = this._request.asReadonly();

  showSchedule(shiftId: string, column: number): void {
    this._request.set({ shiftId, column });
  }

  clear(): void {
    this._request.set(null);
  }
}
