/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { visibleShiftRow } from 'src/app/application/helpers/shift-visible-row';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { isNumeric } from 'src/app/shared/helpers/number.helper';
import { IPaginationDataService } from 'src/app/domain/interfaces/pagination.interface';

@Component({
  selector: 'app-shift-pagination',
  templateUrl: './shift-pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, NgbPaginationModule, TranslateModule],
})
export class ShiftPaginationComponent implements OnInit {
  @Input() dataService!: IPaginationDataService;
  @Input() page = 1;

  @Input() numberOfItemsPerPage = 3;
  @Input() showRowSelector = true;
  @Input() maxSize = 5;
  @Input() rotate = true;
  @Input() ellipses = false;
  @Input() boundaryLinks = true;

  @Output() pageChange = new EventEmitter<number>();
  @Output() numberOfItemsPerPageChange = new EventEmitter<number>();
  @Output() rowSizeChange = new EventEmitter<any>();

  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;
  numberOfItemsPerPageMap = new Map<number, number>();
  realRow = -1;
  visibleRow = visibleShiftRow();

  public translate = inject(TranslateService);
  private localStorageService = inject(LocalStorageService);

  ngOnInit(): void {
    const tmpRow = this.localStorageService.get(MessageLibrary.SELECTED_ROW_ORDER_SHIFT);

    if (tmpRow && isNumeric(tmpRow)) {
      this.realRow = +tmpRow;
      if (+tmpRow !== -1) {
        this.numberOfItemsPerPage = +tmpRow;
        setTimeout(() => this.numberOfItemsPerPageChange.emit(+tmpRow), 0);
      } else {
        this.realRow = -1;
        if (this.numberOfItemsPerPage === 0) {
          this.numberOfItemsPerPage = 3;
        }
      }
    } else {
      this.realRow = -1;
      if (this.numberOfItemsPerPage === 0) {
        this.numberOfItemsPerPage = 3;
      }
      this.localStorageService.set(MessageLibrary.SELECTED_ROW_ORDER_SHIFT, '-1');
    }
  }

  onPageChange(event: number): void {
    this.firstItemOnLastPage = undefined;
    this.isPreviousPage = undefined;
    this.isNextPage = undefined;

    if (event === this.page + 1) {
      this.isNextPage = true;
      if (!this.numberOfItemsPerPageMap.get(this.page)) {
        this.numberOfItemsPerPageMap.set(this.page, this.numberOfItemsPerPage);
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

    this.realRow = value;
    this.page = 1;
    this.pageChange.emit(1);

    this.localStorageService.set(MessageLibrary.SELECTED_ROW_ORDER_SHIFT, value.toString());

    if (value !== -1) {
      this.numberOfItemsPerPage = value;
      this.numberOfItemsPerPageChange.emit(value);
    }

    this.rowSizeChange.emit(event);
  }
}
