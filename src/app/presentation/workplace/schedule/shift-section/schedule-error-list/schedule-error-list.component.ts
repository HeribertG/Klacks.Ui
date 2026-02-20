import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCircleExclamation,
  faTriangleExclamation,
  faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';

export type ErrorListFilterType = 'error' | 'warning' | 'info';

export interface ScheduleErrorEntry {
  type: ErrorListFilterType;
  date: string;
  clientName: string;
  comment: string;
}

@Component({
  selector: 'app-schedule-error-list',
  standalone: true,
  imports: [CommonModule, TranslateModule, FontAwesomeModule],
  templateUrl: './schedule-error-list.component.html',
  styleUrls: ['./schedule-error-list.component.scss'],
})
export class ScheduleErrorListComponent {
  readonly faError = faCircleExclamation;
  readonly faWarning = faTriangleExclamation;
  readonly faInfo = faCircleInfo;

  activeFilters: Set<ErrorListFilterType> = new Set([
    'error',
    'warning',
    'info',
  ]);

  entries: ScheduleErrorEntry[] = [];

  get filteredEntries(): ScheduleErrorEntry[] {
    return this.entries.filter((e) => this.activeFilters.has(e.type));
  }

  toggleFilter(type: ErrorListFilterType): void {
    if (this.activeFilters.has(type)) {
      this.activeFilters.delete(type);
    } else {
      this.activeFilters.add(type);
    }
  }

  isFilterActive(type: ErrorListFilterType): boolean {
    return this.activeFilters.has(type);
  }

  getEntryIcon(type: ErrorListFilterType) {
    switch (type) {
      case 'error':
        return this.faError;
      case 'warning':
        return this.faWarning;
      case 'info':
        return this.faInfo;
    }
  }
}
