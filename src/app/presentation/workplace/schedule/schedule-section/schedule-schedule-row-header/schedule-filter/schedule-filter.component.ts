import { Component, inject, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { IconAscComponent } from 'src/app/presentation/icons/icon-asc.component';
import { IconDescComponent } from 'src/app/presentation/icons/icon-desc.component';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';

@Component({
  selector: 'app-schedule-filter',
  templateUrl: './schedule-filter.component.html',
  styleUrls: ['./schedule-filter.component.scss'],
  standalone: true,
  imports: [TranslateModule, IconAscComponent, IconDescComponent],
  providers: [TableSortingService],
})
export class ScheduleFilterComponent implements OnInit {
  public dataManagementSchedule = inject(DataManagementScheduleService);
  public sortingService = inject(TableSortingService);

  showEmployees = true;
  showExtern = true;
  hoursSortOrder: string | undefined = undefined;

  ngOnInit(): void {
    this.sortingService.initialize({
      columns: ['firstName', 'company', 'name'],
      defaultOrderBy: 'name',
      defaultSortOrder: 'asc',
      useThreeWaySort: true
    });

    this.showEmployees = this.dataManagementSchedule.workFilter.showEmployees;
    this.showExtern = this.dataManagementSchedule.workFilter.showExtern;
    this.hoursSortOrder = this.dataManagementSchedule.workFilter.hoursSortOrder;
  }

  private setFilter() {
    this.dataManagementSchedule.workFilter.orderBy = this.sortingService.getCurrentOrderBy();
    this.dataManagementSchedule.workFilter.sortOrder = this.sortingService.getCurrentSortOrder();
    this.dataManagementSchedule.workFilter.showEmployees = this.showEmployees;
    this.dataManagementSchedule.workFilter.showExtern = this.showExtern;
    this.dataManagementSchedule.workFilter.hoursSortOrder = this.hoursSortOrder;
  }

  private reRead() {
    this.setFilter();
    this.dataManagementSchedule.readWorkSchedule();
  }

  onClickHeader(orderBy: string) {
    this.sortingService.onHeaderClick(orderBy, () => this.reRead());
  }

  onShowEmployeesChange(event: Event) {
    this.showEmployees = (event.target as HTMLInputElement).checked;
    this.reRead();
  }

  onShowExternChange(event: Event) {
    this.showExtern = (event.target as HTMLInputElement).checked;
    this.reRead();
  }

  onClickHours() {
    if (this.hoursSortOrder === undefined) {
      this.hoursSortOrder = 'asc';
    } else if (this.hoursSortOrder === 'asc') {
      this.hoursSortOrder = 'desc';
    } else {
      this.hoursSortOrder = undefined;
    }
    this.reRead();
  }

  getHoursArrow(): string {
    if (this.hoursSortOrder === 'asc') return '↓';
    if (this.hoursSortOrder === 'desc') return '↑';
    return '';
  }
}
