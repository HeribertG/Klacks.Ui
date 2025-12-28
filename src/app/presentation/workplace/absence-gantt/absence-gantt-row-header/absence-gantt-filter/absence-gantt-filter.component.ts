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

    this.showEmployees = this.dataManagementBreak.breakFilter.showEmployees;
    this.showExtern = this.dataManagementBreak.breakFilter.showExtern;
    this.hoursSortOrder = this.dataManagementBreak.breakFilter.hoursSortOrder;
  }

  private setFilter() {
    this.dataManagementBreak.breakFilter.orderBy = this.sortingService.getCurrentOrderBy();
    this.dataManagementBreak.breakFilter.sortOrder = this.sortingService.getCurrentSortOrder();
    this.dataManagementBreak.breakFilter.showEmployees = this.showEmployees;
    this.dataManagementBreak.breakFilter.showExtern = this.showExtern;
    this.dataManagementBreak.breakFilter.hoursSortOrder = this.hoursSortOrder;
  }

  private readPage() {
    this.setFilter();
    this.dataManagementBreak.reRead();
  }

  onClickHeader(orderBy: string) {
    this.sortingService.onHeaderClick(orderBy, () => this.readPage());
  }

  onShowEmployeesChange(event: Event) {
    this.showEmployees = (event.target as HTMLInputElement).checked;
    this.readPage();
  }

  onShowExternChange(event: Event) {
    this.showExtern = (event.target as HTMLInputElement).checked;
    this.readPage();
  }

  onClickHours() {
    if (this.hoursSortOrder === undefined) {
      this.hoursSortOrder = 'asc';
    } else if (this.hoursSortOrder === 'asc') {
      this.hoursSortOrder = 'desc';
    } else {
      this.hoursSortOrder = undefined;
    }
    this.readPage();
  }

  getHoursArrow(): string {
    if (this.hoursSortOrder === 'asc') return '↓';
    if (this.hoursSortOrder === 'desc') return '↑';
    return '';
  }
}
