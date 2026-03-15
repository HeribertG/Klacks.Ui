// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Komponente zur Anzeige der Schedule-Fehlerliste (Kollisionen, Warnungen, Infos).
 * @param activeFilters - Aktive Filtertypen (error, warning, info)
 */
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCircleExclamation,
  faTriangleExclamation,
  faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-common-types';
import { CollisionDetectionService } from 'src/app/domain/services/schedule/collision-detection.service';
import { ErrorListFilterType, ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import { ShowInScheduleService } from 'src/app/presentation/workplace/schedule/services/show-in-schedule.service';

@Component({
  selector: 'app-schedule-error-list',
  standalone: true,
  imports: [CommonModule, TranslateModule, FontAwesomeModule],
  templateUrl: './schedule-error-list.component.html',
  styleUrls: ['./schedule-error-list.component.scss'],
})
export class ScheduleErrorListComponent {
  private collisionService = inject(CollisionDetectionService);
  private showInScheduleService = inject(ShowInScheduleService);

  readonly faError = faCircleExclamation;
  readonly faWarning = faTriangleExclamation;
  readonly faInfo = faCircleInfo;

  activeFilters = signal(new Set<ErrorListFilterType>(['error', 'warning', 'info']));

  filteredEntries = computed(() =>
    this.collisionService.errorEntries().filter((e) => this.activeFilters().has(e.type)),
  );

  toggleFilter(type: ErrorListFilterType): void {
    const updated = new Set(this.activeFilters());
    if (updated.has(type)) {
      updated.delete(type);
    } else {
      updated.add(type);
    }
    this.activeFilters.set(updated);
  }

  isFilterActive(type: ErrorListFilterType): boolean {
    return this.activeFilters().has(type);
  }

  getEntryIcon(type: ErrorListFilterType): IconDefinition {
    switch (type) {
      case 'error':
        return this.faError;
      case 'warning':
        return this.faWarning;
      case 'info':
        return this.faInfo;
    }
  }

  onRowClick(entry: ScheduleErrorEntry): void {
    this.showInScheduleService.showScheduleByClient(entry.clientId, entry.date);
  }
}
