import { Injectable } from '@angular/core';
import { WorkLockLevel } from 'src/app/domain/enums/work-lock-level.enum';
import { IScheduleCell } from 'src/app/domain/models/work-schedule-class';

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

  canUnconfirm(entry: IScheduleCell, isAdmin: boolean): boolean {
    if (isAdmin) return entry.lockLevel <= WorkLockLevel.Confirmed;
    return entry.lockLevel === WorkLockLevel.Confirmed;
  }

  getLockIcon(level: number): string {
    switch (level) {
      case WorkLockLevel.Confirmed:
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" fill="var(--positiveColor)"/></svg>';
      case WorkLockLevel.Approved:
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12"><path d="M9.585.52a2.678 2.678 0 00-3.17 0l-.928.68a1.178 1.178 0 01-.518.215L3.83 1.59a2.678 2.678 0 00-2.24 2.24l-.175 1.14a1.178 1.178 0 01-.215.518l-.68.928a2.678 2.678 0 000 3.17l.68.928c.113.153.186.33.215.518l.175 1.138a2.678 2.678 0 002.24 2.24l1.138.175c.187.029.365.102.518.215l.928.68a2.678 2.678 0 003.17 0l.928-.68a1.17 1.17 0 01.518-.215l1.138-.175a2.678 2.678 0 002.241-2.24l.175-1.138c.029-.187.102-.365.215-.518l.68-.928a2.678 2.678 0 000-3.17l-.68-.928a1.179 1.179 0 01-.215-.518L14.41 3.83a2.678 2.678 0 00-2.24-2.24l-1.138-.175a1.179 1.179 0 01-.518-.215zM7.303 1.728c.531-.39 1.253-.39 1.784 0l.842.617.168.048 1.032.159c.7.108 1.248.657 1.356 1.357l.159 1.032.048.168.617.842c.39.531.39 1.253 0 1.784l-.617.842-.048.168-.159 1.032a1.678 1.678 0 01-1.356 1.357l-1.032.159-.168.048-.842.617c-.531.39-1.253.39-1.784 0l-.842-.617-.168-.048-1.032-.159a1.678 1.678 0 01-1.357-1.357l-.159-1.032-.048-.168-.617-.842a1.678 1.678 0 010-1.784l.617-.842.048-.168.159-1.032a1.678 1.678 0 011.357-1.357l1.032-.159.168-.048zm3.475 3.494a.75.75 0 00-1.06-1.06L7 6.88 5.78 5.66a.75.75 0 00-1.06 1.06l1.75 1.75a.75.75 0 001.06 0z" fill="var(--warningColor)"/></svg>';
      case WorkLockLevel.Closed:
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12"><path d="M4 4v2h-.25A1.75 1.75 0 002 7.75v5.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 13.25v-5.5A1.75 1.75 0 0012.25 6H12V4a4 4 0 10-8 0zm6.5 2V4a2.5 2.5 0 00-5 0v2zM12.25 7.5a.25.25 0 01.25.25v5.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-5.5a.25.25 0 01.25-.25z" fill="var(--negativeColor)"/></svg>';
      default:
        return '';
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
