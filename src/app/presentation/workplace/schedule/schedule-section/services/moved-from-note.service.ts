// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tells where a moved work came from, for the grid, the timeline and the context menu alike: the origin person among the
 * loaded clients and the "taken over from" note. An origin outside the caller's loaded clients reads as hidden.
 * @param entry - The schedule entry whose origin is asked for
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';

const MOVED_FROM_KEY = 'schedule.moved-from';
const MOVED_FROM_HIDDEN_KEY = 'schedule.moved-from-hidden';

@Injectable({ providedIn: 'root' })
export class MovedFromNoteService {
  private translateService = inject(TranslateService);
  private dataManagement = inject(DataManagementScheduleService);

  isOriginVisible(entry: IScheduleCell | null | undefined): boolean {
    return this.originName(entry) !== '';
  }

  noteFor(entry: IScheduleCell | null | undefined): string {
    if (!entry?.movedFromClientId) return '';
    const name = this.originName(entry);
    return name
      ? this.translateService.instant(MOVED_FROM_KEY, { name })
      : this.translateService.instant(MOVED_FROM_HIDDEN_KEY);
  }

  private originName(entry: IScheduleCell | null | undefined): string {
    const originId = entry?.movedFromClientId;
    if (!originId) return '';
    const origin = (this.dataManagement.clients ?? []).find((client) => client.id === originId);
    return [origin?.firstName, origin?.name].filter(Boolean).join(' ');
  }
}
