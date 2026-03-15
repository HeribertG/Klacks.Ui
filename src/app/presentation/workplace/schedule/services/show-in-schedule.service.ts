// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service enabling navigation from ShiftSection or ErrorList to ScheduleSection.
 * When a shift is selected in the shift grid, this service signals
 * the schedule section to scroll to and highlight the corresponding entries.
 * Also supports client-based navigation by clientId and date.
 *
 * @relations
 * - Used by: ShiftContextMenuService (triggers navigation)
 * - Used by: ScheduleSectionComponent (responds to navigation request)
 * - Counterpart: ShowInShiftService (opposite direction)
 */
import { Injectable, signal } from '@angular/core';

export interface ShowInScheduleRequest {
  shiftId?: string;
  clientId?: string;
  date?: string;
  column?: number;
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

  showScheduleByClient(clientId: string, date: string): void {
    this._request.set({ clientId, date });
  }

  clear(): void {
    this._request.set(null);
  }
}
