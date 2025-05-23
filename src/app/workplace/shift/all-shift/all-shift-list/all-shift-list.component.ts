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
import { MockDataManagementShiftService } from 'src/app/data/management/mock-data-management-shift.service';
import { visibleRow } from 'src/app/helpers/sharedItems';
import { OriginalTableComponent } from './original-table/original-table.component';
import { Shift } from 'src/app/core/shift-data-class';

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
  ],
  providers: [MockDataManagementShiftService],
})
export class AllShiftListComponent implements OnInit {
  public translate = inject(TranslateService);
  public dataManagementShiftService = inject(MockDataManagementShiftService);
  public dataManagementShiftService2 = inject(DataManagementShiftService);

  visibleRow: { text: string; value: number }[] = [];
  realRow = 1;
  page = 1;
  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;

  numberOfItemsPerPage = 5;
  numberOfItemsPerPageMap = new Map();

  hoveredRowId?: string;

  ngOnInit(): void {
    this.visibleRow = visibleRow();
  }

  resizeWindow: (() => void) | undefined;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onResize(event: DOMRectReadOnly | any): void {}

  onAddShift(): void {
    this.dataManagementShiftService2.createShift();
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
    // Da wir jetzt den MockDataManagementShiftService verwenden,
    // ist keine zusätzliche Initialisierung notwendig, da die Daten
    // bereits vollständig im Mock vorhanden sind.
    // Falls Sie dennoch Anpassungen an den Daten vornehmen möchten,
    // können Sie das hier tun
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onPageChange(event: number) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onChangeRowSize(event: any): void {}
}
