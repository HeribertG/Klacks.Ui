// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Component for displaying the schedule error list (collisions, warnings, infos).
 * @param activeFilters - Active filter types (error, warning, info)
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import { ErrorListFilterType } from 'src/app/domain/interfaces/error-list-filter-type.type';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import { ShowInScheduleService } from 'src/app/presentation/workplace/schedule/services/show-in-schedule.service';
import { ScheduleErrorListPdfExportService } from './schedule-error-list-pdf-export.service';
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';

@Component({
  selector: 'app-schedule-error-list',
  standalone: true,
  imports: [CommonModule, TranslateModule, FontAwesomeModule, PdfIconComponent],
  templateUrl: './schedule-error-list.component.html',
  styleUrls: ['./schedule-error-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleErrorListComponent {
  private collisionService = inject(CollisionDetectionService);
  private showInScheduleService = inject(ShowInScheduleService);
  private pdfExportService = inject(ScheduleErrorListPdfExportService);

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
    const emptyGuid = '00000000-0000-0000-0000-000000000000';
    if (!entry.clientId || entry.clientId === emptyGuid) return;
    this.showInScheduleService.showScheduleByClient(entry.clientId, entry.date);
  }

  onPdfExport(): void {
    this.pdfExportService.exportToPdf(this.filteredEntries());
  }
}
