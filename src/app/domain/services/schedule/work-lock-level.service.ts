// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable } from '@angular/core';
import { WorkLockLevel } from 'src/app/domain/enums/work-lock-level.enum';
import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-entry-type.enum';
import { hasServiceEnded } from 'src/app/domain/helpers/service-end.helper';

@Injectable({ providedIn: 'root' })
export class WorkLockLevelService {
  canEditEntry(
    entry: IScheduleCell,
    isAdmin: boolean,
  ): boolean {
    if (isAdmin) return true;
    return entry.lockLevel === WorkLockLevel.None && !entry.isGroupRestricted;
  }

  canConfirm(entry: IScheduleCell): boolean {
    return entry.lockLevel === WorkLockLevel.None && !entry.isGroupRestricted;
  }

  /**
   * A work can only be confirmed once its service has ended on the company clock; an absence has no service to wait for.
   */
  isServiceOpen(entry: IScheduleCell, now: Date = new Date()): boolean {
    return (
      entry.entryType === WorkScheduleEntryType.Work &&
      !hasServiceEnded(entry.entryDate, entry.startTime, entry.endTime, now)
    );
  }

  canUnconfirm(entry: IScheduleCell, isAdmin: boolean, isAuthorised = false): boolean {
    return this.canUnseal(entry.lockLevel, isAdmin, isAuthorised);
  }

  canSeal(currentLevel: number, targetLevel: number, isAdmin: boolean, isAuthorised: boolean): boolean {
    if (targetLevel <= currentLevel) return false;
    switch (targetLevel) {
      case WorkLockLevel.Confirmed:
        return true;
      case WorkLockLevel.Approved:
        return isAuthorised || isAdmin;
      case WorkLockLevel.Closed:
        return isAdmin;
      default:
        return false;
    }
  }

  canUnseal(currentLevel: number, isAdmin: boolean, isAuthorised: boolean): boolean {
    if (currentLevel === WorkLockLevel.None) return false;
    switch (currentLevel) {
      case WorkLockLevel.Confirmed:
        return true;
      case WorkLockLevel.Approved:
        return isAuthorised || isAdmin;
      case WorkLockLevel.Closed:
        return isAdmin;
      default:
        return false;
    }
  }

  getLockTooltip(level: number, isGroupRestricted: boolean): string {
    if (isGroupRestricted) return 'lockLevel.groupRestricted';
    switch (level) {
      case WorkLockLevel.Confirmed:
        return 'lockLevel.confirmed';
      case WorkLockLevel.Approved:
        return 'lockLevel.approved';
      case WorkLockLevel.Closed:
        return 'lockLevel.closed';
      default:
        return '';
    }
  }
}
