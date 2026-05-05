// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Shared filter panel for client lists: sort by name/first name/company/guaranteed hours,
 * individual sort toggle (uses saved drag-and-drop order), and employee/extern toggles.
 * @param filter - Bound IClientTypeFilter object; mutated in place on every change
 */
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IconAscComponent } from 'src/app/presentation/icons/icon-asc.component';
import { IconDescComponent } from 'src/app/presentation/icons/icon-desc.component';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { IClientTypeFilter } from './client-filter.interface';

const SORT_COLUMNS = ['firstName', 'name', 'company', 'guaranteedHours'] as const;
const DEFAULT_ORDER_BY = 'name';
const DEFAULT_SORT_ORDER = 'asc' as const;

@Component({
  selector: 'app-client-filter',
  templateUrl: './client-filter.component.html',
  styleUrls: ['./client-filter.component.scss'],
  standalone: true,
  imports: [TranslateModule, IconAscComponent, IconDescComponent],
  providers: [TableSortingService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientFilterComponent implements OnInit {
  @Input() filter!: IClientTypeFilter;
  @Output() filterChange = new EventEmitter<void>();

  protected sortingService = inject(TableSortingService);

  protected showEmployees = true;
  protected showExtern = true;
  protected individualSort = false;

  ngOnInit(): void {
    this.sortingService.initialize({
      columns: [...SORT_COLUMNS],
      defaultOrderBy: DEFAULT_ORDER_BY,
      defaultSortOrder: DEFAULT_SORT_ORDER,
      useThreeWaySort: true,
    });

    this.showEmployees = this.filter.showEmployees;
    this.showExtern = this.filter.showExtern;
    this.individualSort = this.filter.individualSort ?? false;

    if (!this.individualSort && this.filter.orderBy) {
      this.sortingService.restoreSortState(
        this.filter.orderBy,
        this.filter.sortOrder as 'asc' | 'desc' | '',
      );
    }
  }

  private updateFilter(): void {
    if (this.individualSort) {
      this.filter.orderBy = '';
      this.filter.sortOrder = '';
    } else {
      this.filter.orderBy = this.sortingService.getCurrentOrderBy();
      this.filter.sortOrder = this.sortingService.getCurrentSortOrder();
    }
    this.filter.individualSort = this.individualSort;
    this.filter.showEmployees = this.showEmployees;
    this.filter.showExtern = this.showExtern;
    this.filterChange.emit();
  }

  protected onClickHeader(orderBy: string): void {
    if (this.individualSort) return;
    this.sortingService.onHeaderClick(orderBy, () => this.updateFilter());
  }

  protected onToggleIndividualSort(): void {
    this.individualSort = !this.individualSort;
    if (this.individualSort) {
      this.sortingService.initialize({
        columns: [...SORT_COLUMNS],
        defaultOrderBy: DEFAULT_ORDER_BY,
        defaultSortOrder: DEFAULT_SORT_ORDER,
        useThreeWaySort: true,
      });
    }
    this.updateFilter();
  }

  protected onShowEmployeesChange(event: Event): void {
    this.showEmployees = (event.target as HTMLInputElement).checked;
    this.updateFilter();
  }

  protected onShowExternChange(event: Event): void {
    this.showExtern = (event.target as HTMLInputElement).checked;
    this.updateFilter();
  }
}
