/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

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
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { DataManagementShiftCutService } from 'src/app/domain/services/shift/data-management-shift-cut.service';
import { visibleShiftRow } from 'src/app/application/helpers/shift-visible-row';
import { OriginalTableComponent } from './original-table/original-table.component';
import { Shift } from 'src/app/domain/models/shift/shift-class';
import { ShiftTableComponent } from './shift-table/shift-table.component';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PaginationComponent } from 'src/app/presentation/shared/pagination/pagination.component';
import { IPaginationDataService } from 'src/app/domain/interfaces/pagination.interface';
import { ShiftTableResizeService } from 'src/app/presentation/services/shift-table-resize.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { AllShiftStateService } from '../services/all-shift-state.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';

@Component({
  selector: 'app-all-shift-list',
  templateUrl: './all-shift-list.component.html',
  styleUrl: './all-shift-list.component.scss',
  standalone: true,
  imports: [
    FormsModule,
    NgbTooltipModule,
    NgbPaginationModule,
    TranslateModule,
    OriginalTableComponent,
    ShiftTableComponent,
    PaginationComponent
],
  providers: [ShiftTableResizeService, AllShiftStateService, TableSortingService],
})
export class AllShiftListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('shiftTableContainer', { static: false })
  shiftTableContainer?: ElementRef<HTMLElement>;
  public translate = inject(TranslateService);
  public dataManagementShiftService = inject(DataManagementShiftService);
  private dataManagementShiftCutService = inject(DataManagementShiftCutService);
  public authorizationService = inject(AuthorizationService);
  public sortingService = inject(TableSortingService);
  private tableResizeService = inject(ShiftTableResizeService);
  private allShiftStateService = inject(AllShiftStateService);
  private localStorageService = inject(LocalStorageService);
  private navigationService = inject(NavigationService);
  private modalService = inject(ModalService);
  private toastService = inject(ToastShowService);
  private dataShiftService = inject(DataShiftService);

  selectedRowId?: string;

  visibleRow: { text: string; value: number }[] = [];
  realRow = 3;
  page = 1;
  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;

  numberOfItemsPerPage = 3;
  numberOfItemsPerPageMap = new Map();

  hoveredRowId?: string;
  private destroy$ = new Subject<void>();
  private isRecalculating = false;

  async ngOnInit(): Promise<void> {
    this.tableResizeService.setRowHeights(90, 82);
    this.dataManagementShiftService.init();
    await this.allShiftStateService.initializeWorkplaceState();
    this.visibleRow = visibleShiftRow(true);

    this.sortingService.initialize({
      columns: [
        'abbreviation',
        'name',
        'description',
        'valid_from',
        'valid_until',
      ],
      defaultOrderBy: 'name',
      defaultSortOrder: 'asc',
      useThreeWaySort: true,
    });

    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: ModalType) => {
        if (
          result === ModalType.Delete &&
          this.modalService.componentContext === 'all-shift-list' &&
          this.modalService.Filing
        ) {
          this.deleteShift(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
      });

    const wasRestored =
      await this.allShiftStateService.restoreFilterFromStorage();
    if (wasRestored) {
      setTimeout(() => {
        this.page =
          this.dataManagementShiftService.currentFilter.requiredPage + 1;
        this.readPage(true);
      }, 100);
    } else {
      this.readPage(true);
    }
  }

  resizeWindow: (() => void) | undefined;

  onAddShift(): void {
    this.navigationService.navigateToNewShift();
  }

  onClickHeader(orderBy: string): void {
    this.sortingService.onHeaderClick(orderBy, () => this.readPage(true));
  }

  onLostFocus(): void {}

  onClickEdit(data: Shift): void {
    if (data && data.id) {
      this.allShiftStateService.saveCurrentFilter();
      this.navigationService.navigateToEditShift(data.id!);
    }
  }

  onMouseEnter(data: any): void {
    this.hoveredRowId = data.id;
  }

  onClickDelete(s: Shift) {
    if (!s?.id) {
      return;
    }

    this.modalService.Filing = s.id;
    this.modalService.componentContext = 'all-shift-list';
    this.modalService.deleteMessage = this.translate.instant(
      'shift.all-shift.confirm-delete',
      { name: s.name }
    );
    this.modalService.setDefault(ModalType.Delete);
    this.modalService.openModel(ModalType.Delete);
  }

  private async deleteShift(id: string) {
    try {
      await this.dataShiftService.deleteShift(id).toPromise();
      this.toastService.showSuccess(
        this.translate.instant('shift.all-shift.delete-success'),
        ''
      );
      this.readPage(true);
    } catch (error) {
      this.toastService.showError(
        this.translate.instant('shift.all-shift.delete-error'),
        ''
      );
    }
  }

  onClickCut(data: Shift) {
    if (data && data.originalId) {
      this.navigationService.navigateToCutShift(data.originalId);
    }
  }

  onContainerTemplateClicked(data: Shift) {
    if (data && data.id) {
      this.navigationService.navigateToContainerTemplateShift(data.id);
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
      this.readPage(false);
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
    this.readPage(true);
  }

  onItemsPerPageChange(value: number): void {
    if (this.dataManagementShiftService.currentFilter.searchString) {
      return;
    }

    this.dataManagementShiftService.currentFilter.numberOfItemsPerPage = value;
    this.realRow = value;
    this.page = 1;
    this.readPage(false);
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
        .createWindowResizeObservable()
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          if (this.tableResizeService.isAutoMode()) {
            if (this.page !== 1) {
              return;
            }

            if (this.dataManagementShiftService.currentFilter.searchString) {
              return;
            }

            if (!this.allShiftStateService.isResizeCalculationAllowed()) {
              return;
            }

            const optimalRows = this.tableResizeService.calculateOptimalRowCount(
              tableElement as HTMLElement
            );
            const currentRows =
              this.dataManagementShiftService.currentFilter
                .numberOfItemsPerPage;

            if (Math.abs(currentRows - optimalRows) >= 1) {
              this.dataManagementShiftService.currentFilter.numberOfItemsPerPage =
                optimalRows;
              this.realRow = optimalRows;
              this.page = 1;
              this.readPage(true);
            }
          }
        });

      this.tableResizeService
        .createTableResizeObservable(tableElement as HTMLElement)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          if (this.tableResizeService.isAutoMode()) {
            if (this.page !== 1) {
              return;
            }

            if (this.dataManagementShiftService.currentFilter.searchString) {
              return;
            }

            if (!this.allShiftStateService.isResizeCalculationAllowed()) {
              return;
            }

            if (!this.tableResizeService.hasVerticalScrollbar()) {
              return;
            }

            const optimalRows = this.tableResizeService.calculateOptimalRowCount(
              tableElement as HTMLElement
            );
            const currentRows =
              this.dataManagementShiftService.currentFilter
                .numberOfItemsPerPage;

            if (Math.abs(currentRows - optimalRows) >= 1) {
              this.dataManagementShiftService.currentFilter.numberOfItemsPerPage =
                optimalRows;
              this.realRow = optimalRows;
              this.page = 1;
              this.readPage(true);
            }
          }
        });
    }, 200);
  }

  private readPage(shouldRecalculate = false): void {
    this.allShiftStateService.prepareFilterForRequest(
      this.sortingService.getCurrentOrderBy(),
      this.sortingService.getCurrentSortOrder(),
      this.page,
      this.firstItemOnLastPage,
      this.isPreviousPage,
      this.isNextPage
    );
    this.dataManagementShiftService.readPage(true);

    if (shouldRecalculate && !this.isRecalculating) {
      setTimeout(() => {
        this.recalculateTableHeight();
      }, 300);
    }
  }

  private recalculateTableHeight(): void {
    if (!this.tableResizeService.isAutoMode()) {
      return;
    }

    if (!this.shiftTableContainer?.nativeElement) {
      return;
    }

    if (this.dataManagementShiftService.currentFilter.searchString) {
      return;
    }

    const tableElement =
      this.shiftTableContainer.nativeElement.querySelector('table') ||
      this.shiftTableContainer.nativeElement;

    const optimalRows = this.tableResizeService.calculateOptimalRowCount(
      tableElement as HTMLElement
    );

    const currentRows =
      this.dataManagementShiftService.currentFilter.numberOfItemsPerPage;

    if (Math.abs(currentRows - optimalRows) >= 1) {
      this.isRecalculating = true;
      this.dataManagementShiftService.currentFilter.numberOfItemsPerPage =
        optimalRows;
      this.realRow = optimalRows;
      this.page = 1;
      this.dataManagementShiftService.readPage(true);

      setTimeout(() => {
        this.isRecalculating = false;
      }, 500);
    }
  }
}
