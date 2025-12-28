import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IconAscComponent } from 'src/app/presentation/icons/icon-asc.component';
import { IconDescComponent } from 'src/app/presentation/icons/icon-desc.component';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { IClientTypeFilter } from './client-filter.interface';

@Component({
  selector: 'app-client-filter',
  templateUrl: './client-filter.component.html',
  styleUrls: ['./client-filter.component.scss'],
  standalone: true,
  imports: [TranslateModule, IconAscComponent, IconDescComponent],
  providers: [TableSortingService],
})
export class ClientFilterComponent implements OnInit {
  @Input() filter!: IClientTypeFilter;
  @Output() filterChange = new EventEmitter<void>();

  public sortingService = inject(TableSortingService);

  showEmployees = true;
  showExtern = true;
  hoursSortOrder: string | undefined = undefined;

  ngOnInit(): void {
    this.sortingService.initialize({
      columns: ['firstName', 'company', 'name'],
      defaultOrderBy: 'name',
      defaultSortOrder: 'asc',
      useThreeWaySort: true,
    });

    this.showEmployees = this.filter.showEmployees;
    this.showExtern = this.filter.showExtern;
    this.hoursSortOrder = this.filter.hoursSortOrder;
  }

  private updateFilter(): void {
    this.filter.orderBy = this.sortingService.getCurrentOrderBy();
    this.filter.sortOrder = this.sortingService.getCurrentSortOrder();
    this.filter.showEmployees = this.showEmployees;
    this.filter.showExtern = this.showExtern;
    this.filter.hoursSortOrder = this.hoursSortOrder;
    this.filterChange.emit();
  }

  onClickHeader(orderBy: string): void {
    this.sortingService.onHeaderClick(orderBy, () => this.updateFilter());
  }

  onShowEmployeesChange(event: Event): void {
    this.showEmployees = (event.target as HTMLInputElement).checked;
    this.updateFilter();
  }

  onShowExternChange(event: Event): void {
    this.showExtern = (event.target as HTMLInputElement).checked;
    this.updateFilter();
  }

  onClickHours(): void {
    if (this.hoursSortOrder === undefined) {
      this.hoursSortOrder = 'asc';
    } else if (this.hoursSortOrder === 'asc') {
      this.hoursSortOrder = 'desc';
    } else {
      this.hoursSortOrder = undefined;
    }
    this.updateFilter();
  }

  getHoursArrow(): string {
    if (this.hoursSortOrder === 'asc') return '↓';
    if (this.hoursSortOrder === 'desc') return '↑';
    return '';
  }
}
