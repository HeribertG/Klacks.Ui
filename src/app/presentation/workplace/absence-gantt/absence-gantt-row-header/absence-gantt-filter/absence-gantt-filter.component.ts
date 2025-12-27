import { Component, inject, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/absence/data-management-break-placeholder.service';
import { IconAscComponent } from 'src/app/presentation/icons/icon-asc.component';
import { IconDescComponent } from 'src/app/presentation/icons/icon-desc.component';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';

@Component({
  selector: 'app-absence-gantt-filter',
  templateUrl: './absence-gantt-filter.component.html',
  styleUrls: ['./absence-gantt-filter.component.scss'],
  standalone: true,
  imports: [TranslateModule, IconAscComponent, IconDescComponent],
  providers: [TableSortingService],
})
export class AbsenceGanttFilterComponent implements OnInit {
  public dataManagementBreak = inject(DataManagementBreakPlaceholderService);
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
    this.dataManagementBreak.breakFilter.orderBy = this.sortingService.getCurrentOrderBy();
    this.dataManagementBreak.breakFilter.sortOrder = this.sortingService.getCurrentSortOrder();
  }

  private readPage() {
    this.setFilter();
    this.dataManagementBreak.reRead();
  }

  /* #region   header */

  onClickHeader(orderBy: string) {
    this.sortingService.onHeaderClick(orderBy, () => this.readPage());
  }

  /* #endregion   header */
}
