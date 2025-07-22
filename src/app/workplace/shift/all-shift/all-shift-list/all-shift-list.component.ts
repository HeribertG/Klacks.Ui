/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { CutTableComponent } from './cut-table/cut-table.component';
import { AuthorizationService } from 'src/app/services/authorization.service';

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
    CutTableComponent,
  ],
})
export class AllShiftListComponent implements OnInit {
  public translate = inject(TranslateService);
  public dataManagementShiftService = inject(DataManagementShiftService);
  public authorizationService = inject(AuthorizationService);

  selectedRowId?: string;

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

  onAddShift(): void {
    this.dataManagementShiftService.createShift();
  }

  onLostFocus(): void {}

  onClickEdit(data: Shift): void {
    if (data && data.id) {
      this.dataManagementShiftService.readShift(data.id);
    }
  }

  onMouseEnter(data: any): void {
    this.hoveredRowId = data.id;
  }

  onClickDelete(s: Shift) {}

  onClickCut(data: Shift) {
    if (data && data.originalId) {
      this.dataManagementShiftService.readCutShiftList(data.originalId);
    }
  }

  onMouseLeave(): void {
    this.hoveredRowId = undefined;
  }

  initializeData(): void {
    this.dataManagementShiftService.init();
  }

  onPageChange(event: number) {
    setTimeout(() => this.dataManagementShiftService.readPage(), 50);
  }

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
