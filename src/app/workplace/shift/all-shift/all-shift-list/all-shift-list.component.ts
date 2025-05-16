import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NgbPaginationModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IShift, Shift } from 'src/app/core/schedule-class';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { MockDataManagementShiftService } from 'src/app/data/management/mock-data-management-shift.service';
import { visibleRow } from 'src/app/helpers/sharedItems';
import { IconTreeComponent } from 'src/app/icons/icon-tree.component';
import { PencilIconGreyComponent } from 'src/app/icons/pencil-icon-grey.component';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';

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
    PencilIconGreyComponent,
    TrashIconRedComponent,
  ],
  providers: [MockDataManagementShiftService],
})
export class AllShiftListComponent implements OnInit, AfterViewInit, OnDestroy {
  public translate = inject(TranslateService);
  public dataManagementShiftService = inject(MockDataManagementShiftService);
  public dataManagementShiftService2 = inject(DataManagementShiftService);

  highlightRowId?: string;
  selectedRowId?: string;

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
  ngAfterViewInit(): void {}

  ngOnDestroy(): void {}

  resizeWindow: (() => void) | undefined;

  onResize(event: DOMRectReadOnly | any): void {}

  onAddShift(): void {
    this.dataManagementShiftService2.createShift();
  }

  onLostFocus(): void {}

  onClickedRow(data: any): void {
    this.selectedRowId = this.selectedRowId === data.id ? undefined : data.id;
  }

  onClickEdit(data: any): void {
    // Weitere bestehende Logik beibehalten
  }

  onMouseEnter(data: any): void {
    this.hoveredRowId = data.id;
  }

  onMouseLeave(): void {
    this.hoveredRowId = undefined;
  }

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

  onPageChange(event: number) {}

  onChangeRowSize(event: any): void {}
}
