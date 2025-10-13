/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';
import {
  NgbPaginationModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { DataManagementShiftCutService } from 'src/app/domain/services/shift/data-management-shift-cut.service';
import { visibleRow } from 'src/app/application/helpers/sharedItems';
import { OriginalTableComponent } from './original-table/original-table.component';
import { Shift } from 'src/app/domain/models/shift-class';
import { CutTableComponent } from './cut-table/cut-table.component';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PaginationComponent } from 'src/app/presentation/shared/pagination/pagination.component';
import { IPaginationDataService } from 'src/app/domain/interfaces/pagination.interface';
import { TableResizeService } from 'src/app/presentation/services/table-resize.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { AllShiftStateService } from '../services/all-shift-state.service';

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
    PaginationComponent,
  ],
  providers: [TableResizeService, AllShiftStateService],
})
export class AllShiftListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('shiftTableContainer', { static: false })
  shiftTableContainer?: ElementRef<HTMLElement>;
  public translate = inject(TranslateService);
  public dataManagementShiftService = inject(DataManagementShiftService);
  private dataManagementShiftCutService = inject(DataManagementShiftCutService);
  public authorizationService = inject(AuthorizationService);
  private tableResizeService = inject(TableResizeService);
  private allShiftStateService = inject(AllShiftStateService);
  private localStorageService = inject(LocalStorageService);

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
  private destroy$ = new Subject<void>();

  async ngOnInit(): Promise<void> {
    this.tableResizeService.setRowHeights(90, 82);
    this.dataManagementShiftService.init();
    await this.allShiftStateService.initializeWorkplaceState();
    this.visibleRow = visibleRow(true);

    const wasRestored =
      await this.allShiftStateService.restoreFilterFromStorage();
    if (wasRestored) {
      setTimeout(() => {
        this.page =
          this.dataManagementShiftService.currentFilter.requiredPage + 1;
        this.readPage();
      }, 100);
    } else {
      this.readPage();
    }
  }

  resizeWindow: (() => void) | undefined;

  onAddShift(): void {
    this.dataManagementShiftService.createShift();
  }

  onLostFocus(): void {}

  onClickEdit(data: Shift): void {
    if (data && data.id) {
      this.allShiftStateService.saveCurrentFilter();
      this.dataManagementShiftService.readShift(data.id);
    }
  }

  onMouseEnter(data: any): void {
    this.hoveredRowId = data.id;
  }

  onClickDelete(s: Shift) {}

  onClickCut(data: Shift) {
    if (data && data.originalId) {
      this.dataManagementShiftCutService.readCutShiftList(data.originalId);
    }
  }

  onMouseLeave(): void {
    this.hoveredRowId = undefined;
  }

  initializeData(): void {
    this.dataManagementShiftService.init();
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
      this.firstItemOnLastPage = this.dataManagementShiftService.firstItem;
    } else if (event === this.page - 1) {
      this.isPreviousPage = true;
      this.firstItemOnLastPage = this.dataManagementShiftService.firstItem;
    }

    this.page = event;
    setTimeout(() => {
      this.readPage();
    }, 100);
  }

  onChangeRowSize(event: any): void {
    const value = +event.srcElement.value;
    this.realRow = value;

    if (value === -1 && this.shiftTableContainer?.nativeElement) {
      const tableElement =
        this.shiftTableContainer.nativeElement.querySelector('table') ||
        this.shiftTableContainer.nativeElement;
      const optimalRows = this.tableResizeService.calculateOptimalRowCount(
        tableElement as HTMLElement
      );
      this.dataManagementShiftService.currentFilter.numberOfItemsPerPage =
        optimalRows;
      this.realRow = optimalRows;
    } else {
      this.dataManagementShiftService.currentFilter.numberOfItemsPerPage =
        value;
    }

    this.dataManagementShiftService.firstItem = 0;
    this.page = 1;
    this.readPage();
  }

  onItemsPerPageChange(value: number): void {
    if (this.dataManagementShiftService.currentFilter.searchString) {
      return;
    }

    this.dataManagementShiftService.currentFilter.numberOfItemsPerPage = value;
    this.realRow = value;
    this.page = 1;
    this.readPage();
  }

  get paginationDataService(): IPaginationDataService {
    return {
      maxItems: this.dataManagementShiftService.maxItems,
      firstItem: this.dataManagementShiftService.firstItem,
      maxPages: this.dataManagementShiftService.maxPages,
    };
  }

  ngAfterViewInit(): void {
    this.setupTableResize();
  }

  ngOnDestroy(): void {
    this.allShiftStateService.saveCurrentFilter();

    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupTableResize(): void {
    setTimeout(() => {
      if (!this.shiftTableContainer?.nativeElement) return;

      const tableElement =
        this.shiftTableContainer.nativeElement.querySelector('table') ||
        this.shiftTableContainer.nativeElement;

      this.tableResizeService
        .createResizeObservable(tableElement as HTMLElement)
        .pipe(takeUntil(this.destroy$))
        .subscribe((optimalRows: number) => {
          if (this.tableResizeService.isAutoMode()) {
            const currentRows =
              this.dataManagementShiftService.currentFilter
                .numberOfItemsPerPage;

            if (this.dataManagementShiftService.currentFilter.searchString) {
              return;
            }

            if (!this.allShiftStateService.isResizeCalculationAllowed()) {
              return;
            }

            if (Math.abs(currentRows - optimalRows) >= 1) {
              this.dataManagementShiftService.currentFilter.numberOfItemsPerPage =
                optimalRows;
              this.realRow = optimalRows;
              this.page = 1;
              this.readPage();
            }
          }
        });
    }, 200);
  }

  private readPage(): void {
    this.allShiftStateService.prepareFilterForRequest(
      this.dataManagementShiftService.currentFilter.orderBy,
      this.dataManagementShiftService.currentFilter.sortOrder,
      this.page,
      this.firstItemOnLastPage,
      this.isPreviousPage,
      this.isNextPage
    );
    this.dataManagementShiftService.readPage(true);
  }
}
