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

  ngOnInit(): void {
    this.sortingService.initialize({
      columns: ['firstName', 'company', 'name', 'type'],
      defaultOrderBy: 'name',
      defaultSortOrder: 'asc',
      useThreeWaySort: true
    });
  }

  private setFilter() {
    this.dataManagementSchedule.workFilter.orderBy = this.sortingService.getCurrentOrderBy();
    this.dataManagementSchedule.workFilter.sortOrder = this.sortingService.getCurrentSortOrder();
  }

  private reRead() {
    this.setFilter();
    this.dataManagementSchedule.readWorkSchedule();
  }

  onClickHeader(orderBy: string) {
    this.sortingService.onHeaderClick(orderBy, () => this.reRead());
  }
}
