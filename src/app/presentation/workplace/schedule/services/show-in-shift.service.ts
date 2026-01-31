/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service enabling navigation from ScheduleSection to ShiftSection.
 * When a schedule entry is selected, this service signals the shift
 * section to scroll to and highlight the corresponding shift.
 *
 * @relations
 * - Used by: ScheduleNavigationService (triggers navigation)
 * - Used by: ShiftSectionComponent (responds to navigation request)
 * - Counterpart: ShowInScheduleService (opposite direction)
 */
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
