// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Filter component for the shift section dropdown.
 * Provides text search and toggle filters for shift types
 * (sporadic, time range, container, standard shifts).
 *
 * @relations
 * - Parent: ShiftSectionComponent
 * - Uses: DataManagementScheduleService for filter state
 * - Triggers: Shift data refresh on filter change
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';

@Component({
  selector: 'app-shift-filter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbDropdownModule,
    FontAwesomeModule,
  ],
  templateUrl: './shift-filter.component.html',
  styleUrls: ['./shift-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShiftFilterComponent {
  public dataManagement = inject(DataManagementScheduleService);
  public faSearch = faSearch;

  onShiftFilterChange(): void {
    this.dataManagement.readShiftSchedule();
  }

  onSearchInputChange(): void {
    if (!this.dataManagement.shiftScheduleFilter.searchString) {
      this.onShiftFilterChange();
    }
  }

  clearShiftFilters(): void {
    this.dataManagement.shiftScheduleFilter.searchString = undefined;
    this.dataManagement.shiftScheduleFilter.isSporadic = true;
    this.dataManagement.shiftScheduleFilter.isTimeRange = true;
    this.dataManagement.shiftScheduleFilter.container = true;
    this.dataManagement.shiftScheduleFilter.isStandartShift = true;
    this.dataManagement.shiftScheduleFilter.showUngroupedShifts = false;
    this.onShiftFilterChange();
  }
}
