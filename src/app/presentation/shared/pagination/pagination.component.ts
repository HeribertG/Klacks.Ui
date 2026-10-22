// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  input,
  output
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { visibleRow } from 'src/app/application/helpers/sharedItems';
import { visibleShiftRow } from 'src/app/application/helpers/shift-visible-row';
import { RowSizePreferenceService } from 'src/app/domain/services/shared/row-size-preference.service';
import { AUTOMATIC_ROW_SIZE } from 'src/app/domain/constants/row-size.constants';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { IPaginationDataService } from 'src/app/domain/interfaces/pagination.interface';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  standalone: true,
  imports: [FormsModule, NgbPaginationModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent implements OnInit {
  readonly paginationType = input<'standard' | 'shift'>('standard');
  @Input() dataService!: IPaginationDataService;
  @Input() page = 1;
  @Input() numberOfItemsPerPage?: number;
  @Input() showRowSelector = true;
  @Input() maxSize = 5;
  readonly rotate = input(true);
  readonly ellipses = input(false);
  readonly boundaryLinks = input(true);

  readonly pageChange = output<number>();
  readonly numberOfItemsPerPageChange = output<number>();
  readonly rowSizeChange = output<Event>();

  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;
  numberOfItemsPerPageMap = new Map<number, number>();
  realRow = -1;
  visibleRow: { text: string; value: number }[] = [];

  private rowSizePreference = inject(RowSizePreferenceService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (this.numberOfItemsPerPage === undefined) {
      this.numberOfItemsPerPage = this.paginationType() === 'shift' ? 3 : 5;
    }

    const storageKey = this.paginationType() === 'shift'
      ? DomainMessages.SELECTED_ROW_ORDER_SHIFT
      : DomainMessages.SELECTED_ROW_ORDER;

    this.visibleRow = this.paginationType() === 'shift'
      ? visibleShiftRow()
      : visibleRow();

    const fallbackDefault = this.paginationType() === 'shift' ? 3 : 10;

    const savedRowSize = this.rowSizePreference.read(storageKey);

    if (savedRowSize !== null) {
      this.realRow = savedRowSize;
      if (savedRowSize !== AUTOMATIC_ROW_SIZE) {
        this.numberOfItemsPerPage = savedRowSize;
        setTimeout(() => {
          this.numberOfItemsPerPageChange.emit(savedRowSize);
          this.cdr.markForCheck();
        }, 0);
      } else {
        this.realRow = -1;
        if (this.numberOfItemsPerPage === 0) {
          this.numberOfItemsPerPage = fallbackDefault;
        }
      }
    } else {
      this.realRow = -1;
      if (this.numberOfItemsPerPage === 0) {
        this.numberOfItemsPerPage = fallbackDefault;
      }
      this.rowSizePreference.save(storageKey, AUTOMATIC_ROW_SIZE);
    }
  }

  onPageChange(event: number): void {
    this.firstItemOnLastPage = undefined;
    this.isPreviousPage = undefined;
    this.isNextPage = undefined;

    if (event === this.page + 1) {
      this.isNextPage = true;
      if (!this.numberOfItemsPerPageMap.get(this.page)) {
        this.numberOfItemsPerPageMap.set(this.page, this.numberOfItemsPerPage!);
      }
      this.firstItemOnLastPage = this.dataService.firstItem;
    } else if (event === this.page - 1) {
      this.isPreviousPage = true;
      this.firstItemOnLastPage = this.dataService.firstItem;
    }

    this.page = event;
    this.pageChange.emit(event);
  }

  onChangeRowSize(event: Event): void {
    const value = +(event.srcElement as HTMLSelectElement).value;
    const storageKey = this.paginationType() === 'shift'
      ? DomainMessages.SELECTED_ROW_ORDER_SHIFT
      : DomainMessages.SELECTED_ROW_ORDER;

    this.realRow = value;
    this.page = 1;
    this.pageChange.emit(1);
    this.rowSizePreference.save(storageKey, value);

    if (value !== -1) {
      this.numberOfItemsPerPage = value;
      this.numberOfItemsPerPageChange.emit(value);
    }

    this.rowSizeChange.emit(event);
  }
}
