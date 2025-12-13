import { Component, inject } from '@angular/core';
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
    this.dataManagement.shiftScheduleFilter.isSporadic = undefined;
    this.dataManagement.shiftScheduleFilter.isTimeRange = undefined;
    this.dataManagement.shiftScheduleFilter.container = undefined;
    this.dataManagement.shiftScheduleFilter.isStandartShift = undefined;
    this.onShiftFilterChange();
  }
}
