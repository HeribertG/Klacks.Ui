/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NgbPaginationModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { visibleRow } from 'src/app/helpers/sharedItems';
import { OriginalTableComponent } from './original-table/original-table.component';
import { Shift } from 'src/app/core/shift-class';
import { IconScissorComponent } from 'src/app/icons/icon-scissor.component';
import { CutTableComponent } from './cut-table/cut-table.component';

@Component({
  selector: 'app-all-shift-list',
  templateUrl: './all-shift-list.component.html',
  styleUrl: './all-shift-list.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbTooltipModule,
    NgbPaginationModule,
    TranslateModule,
    OriginalTableComponent,
    IconScissorComponent,
    CutTableComponent,
  ],
})
export class AllShiftListComponent implements OnInit {
  public translate = inject(TranslateService);
  public dataManagementShiftService = inject(DataManagementShiftService);

  visibleRow: { text: string; value: number }[] = [];
  realRow = 5;
  page = 1;
  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;

  numberOfItemsPerPage = 5;
  numberOfItemsPerPageMap = new Map();

  hoveredRowId?: string;

  ngOnInit(): void {
    this.dataManagementShiftService.init();
    this.visibleRow = visibleRow(false);
    this.readPage();
  }

  resizeWindow: (() => void) | undefined;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onResize(event: DOMRectReadOnly | any): void {}

  onAddShift(): void {
    this.dataManagementShiftService.createShift();
  }

  onLostFocus(): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClickedRow(data: any): void {
    //this.selectedRowId = this.selectedRowId === data.id ? undefined : data.id;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClickEdit(data: any): void {
    // Weitere bestehende Logik beibehalten
  }

  onMouseEnter(data: any): void {
    this.hoveredRowId = data.id;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClickDelete(s: Shift) {}

  onMouseLeave(): void {
    this.hoveredRowId = undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  open(data: any): void {
    // Weitere bestehende Logik beibehalten
  }

  initializeData(): void {
    this.dataManagementShiftService.init();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onPageChange(event: number) {}

  onChangeRowSize(event: any): void {
    const value = +event.srcElement.value;
    this.realRow = value;
    this.dataManagementShiftService.firstItem = 0;
    this.page = 1;
    this.readPage();
  }

  private readPage(): void {
    this.dataManagementShiftService.currentFilter.numberOfItemsPerPage =
      this.realRow;
    this.dataManagementShiftService.readPage(true);
  }
}
