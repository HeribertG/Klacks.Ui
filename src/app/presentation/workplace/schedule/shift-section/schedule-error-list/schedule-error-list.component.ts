// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, effect, inject, Injector, OnInit, runInInjectionContext } from '@angular/core';
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
import { ScheduleErrorEntry, ErrorListFilterType } from 'src/app/domain/interfaces/schedule-error-entry.interface';

@Component({
  selector: 'app-schedule-error-list',
  standalone: true,
  imports: [CommonModule, TranslateModule, FontAwesomeModule],
  templateUrl: './schedule-error-list.component.html',
  styleUrls: ['./schedule-error-list.component.scss'],
})
export class ScheduleErrorListComponent implements OnInit {
  private injector = inject(Injector);
  private collisionService = inject(CollisionDetectionService);

  readonly faError = faCircleExclamation;
  readonly faWarning = faTriangleExclamation;
  readonly faInfo = faCircleInfo;

  activeFilters = new Set<ErrorListFilterType>([
    'error',
    'warning',
    'info',
  ]);

  entries: ScheduleErrorEntry[] = [];

  ngOnInit(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.collisionService.collisionsUpdated();
        this.entries = this.collisionService.getErrorEntries();
      });
    });
  }

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
}
