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
import { visibleRow } from '../../helpers/sharedItems';
import { LocalStorageService } from '../../services/local-storage.service';
import { MessageLibrary } from '../../helpers/string-constants';
import { isNumeric } from '../../helpers/format-helper';

export interface IPaginationDataService {
  maxItems: number;
  firstItem: number;
  maxPages: number;
}

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, NgbPaginationModule, TranslateModule],
})
export class PaginationComponent implements OnInit {
  @Input() dataService!: IPaginationDataService;
  @Input() page = 1;

  
  @Input() numberOfItemsPerPage = 5;
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
  visibleRow = visibleRow();

  public translate = inject(TranslateService);
  private localStorageService = inject(LocalStorageService);

  ngOnInit(): void {
    const tmpRow = this.localStorageService.get(MessageLibrary.SELECTED_ROW_ORDER);
    
    
    if (tmpRow && isNumeric(tmpRow)) {
      this.realRow = +tmpRow;
      if (+tmpRow !== -1) {
        this.numberOfItemsPerPage = +tmpRow;
        setTimeout(() => this.numberOfItemsPerPageChange.emit(+tmpRow), 0);
      } else {
        // Auto mode - don't emit numberOfItemsPerPageChange, let the parent manage the value
        this.realRow = -1;
        if (this.numberOfItemsPerPage === 0) {
          this.numberOfItemsPerPage = 10;
        }
      }
    } else {
      // No value in localStorage, default to auto mode (-1)
      this.realRow = -1;
      if (this.numberOfItemsPerPage === 0) {
        this.numberOfItemsPerPage = 10;
      }
      // Save the default auto mode to localStorage
      this.localStorageService.set(MessageLibrary.SELECTED_ROW_ORDER, '-1');
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

    this.localStorageService.set(MessageLibrary.SELECTED_ROW_ORDER, value.toString());
    
    if (value !== -1) {
      this.numberOfItemsPerPage = value;
      this.numberOfItemsPerPageChange.emit(value);
    }

    this.rowSizeChange.emit(event);
  }
}
