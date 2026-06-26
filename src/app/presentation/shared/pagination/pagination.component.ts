// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChangeDetectorRef,
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  input
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { visibleRow } from 'src/app/application/helpers/sharedItems';
import { visibleShiftRow } from 'src/app/application/helpers/shift-visible-row';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { isNumeric } from 'src/app/shared/helpers/number.helper';
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

  @Output() pageChange = new EventEmitter<number>();
  @Output() numberOfItemsPerPageChange = new EventEmitter<number>();
  @Output() rowSizeChange = new EventEmitter<any>();

  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;
  numberOfItemsPerPageMap = new Map<number, number>();
  realRow = -1;
  visibleRow: { text: string; value: number }[] = [];

  private localStorageService = inject(LocalStorageService);
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

    const tmpRow = this.localStorageService.get(storageKey);

    if (tmpRow && isNumeric(tmpRow)) {
      this.realRow = +tmpRow;
      if (+tmpRow !== -1) {
        this.numberOfItemsPerPage = +tmpRow;
        setTimeout(() => {
          this.numberOfItemsPerPageChange.emit(+tmpRow);
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
      this.localStorageService.set(storageKey, '-1');
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

  onChangeRowSize(event: any): void {
    const value = +event.srcElement.value;
    const storageKey = this.paginationType() === 'shift'
      ? DomainMessages.SELECTED_ROW_ORDER_SHIFT
      : DomainMessages.SELECTED_ROW_ORDER;

    this.realRow = value;
    this.page = 1;
    this.pageChange.emit(1);
    this.localStorageService.set(storageKey, value.toString());

    if (value !== -1) {
      this.numberOfItemsPerPage = value;
      this.numberOfItemsPerPageChange.emit(value);
    }

    this.rowSizeChange.emit(event);
  }
}
