// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  viewChild,
  signal
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
import { DataProactiveAttributionService } from 'src/app/infrastructure/api/assistant/data-proactive-attribution.service';
import { IProactiveShiftAttribution } from 'src/app/domain/models/assistant/proactive-shift-attribution.interface';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';
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
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';
import { QuickPrintActionService } from 'src/app/presentation/services/quick-print-action.service';
import { SHIFT_FILTER_TYPE_TO_REPORT_SOURCE } from 'src/app/domain/models/report/report-data-source.model';

@Component({
  selector: 'app-all-shift-list',
  templateUrl: './all-shift-list.component.html',
  styleUrl: './all-shift-list.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NgbTooltipModule,
    NgbPaginationModule,
    TranslateModule,
    OriginalTableComponent,
    ShiftTableComponent,
    PaginationComponent,
    PdfIconComponent
],
  providers: [ShiftTableResizeService, AllShiftStateService, TableSortingService],
})
export class AllShiftListComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly shiftTableContainer = viewChild<ElementRef<HTMLElement>>('shiftTableContainer');
  public translate = inject(TranslateService);
  public dataManagementShiftService = inject(DataManagementShiftService);
  private dataManagementShiftCutService = inject(DataManagementShiftCutService);
  public authorizationService = inject(AuthorizationService);
  public sortingService = inject(TableSortingService);
  public quickPrintAction = inject(QuickPrintActionService);
  private tableResizeService = inject(ShiftTableResizeService);
  private allShiftStateService = inject(AllShiftStateService);
  private localStorageService = inject(LocalStorageService);
  private navigationService = inject(NavigationService);
  private modalService = inject(ModalService);
  private toastService = inject(ToastShowService);
  private dataShiftService = inject(DataShiftService);
  private dataProactiveAttributionService = inject(DataProactiveAttributionService);
  private cdr = inject(ChangeDetectorRef);

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
  isQuickPrinting = signal(false);
  readonly proactiveAttributions = signal<ReadonlyMap<string, IProactiveShiftAttribution>>(new Map());
  private destroy$ = new Subject<void>();
  private isRecalculating = false;
  private proactiveAttributionRequest = 0;

  async ngOnInit(): Promise<void> {
    this.tableResizeService.setRowHeights(90, 82);
    void this.quickPrintAction.ensureDefaultsLoaded().then(() => this.cdr.markForCheck());
    this.dataManagementShiftService.init();
    await this.allShiftStateService.initializeWorkplaceState();
    const baseCallback = this.dataManagementShiftService.onExternalFilterChange;
    this.dataManagementShiftService.onExternalFilterChange = () => {
      if (baseCallback) {
        baseCallback();
      }
      this.readProactiveAttributions();
      this.cdr.markForCheck();
    };
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
          this.cdr.markForCheck();
        }
      });

    const wasRestored =
      await this.allShiftStateService.restoreFilterFromStorage();
    if (wasRestored) {
      setTimeout(() => {
        this.page =
          this.dataManagementShiftService.currentFilter.requiredPage + 1;
        this.readPage(true);
        this.cdr.markForCheck();
      }, 100);
    } else {
      this.readPage(true);
    }
  }

  resizeWindow: (() => void) | undefined;

  onAddShift(): void {
    this.navigationService.navigateToNewShift();
  }

  currentPrintSourceId(): string | undefined {
    return SHIFT_FILTER_TYPE_TO_REPORT_SOURCE[
      this.dataManagementShiftService.currentFilter.filterType
    ];
  }

  async onClickQuickPrint(sourceId: string): Promise<void> {
    if (this.isQuickPrinting()) {
      return;
    }

    this.isQuickPrinting.set(true);
    try {
      await this.quickPrintAction.print({
        sourceId,
        fallbackDataSetIds: ['shifts'],
        params: { shiftFilter: this.dataManagementShiftService.currentFilter },
      });
    } finally {
      this.isQuickPrinting.set(false);
      this.cdr.markForCheck();
    }
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

  onClickInfo(data: Shift): void {
    if (data && data.id) {
      this.allShiftStateService.saveCurrentFilter();
      this.navigationService.navigateToEditShift(data.id, true);
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
      this.cdr.markForCheck();
    } catch (error) {
      this.toastService.showError(
        this.translate.instant('shift.all-shift.delete-error'),
        ''
      );
      this.cdr.markForCheck();
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
      this.cdr.markForCheck();
    }, 100);
  }

  onChangeRowSize(event: any): void {
    const value = +event.srcElement.value;
    this.realRow = value;

    const shiftTableContainer = this.shiftTableContainer();
    if (value === -1 && shiftTableContainer?.nativeElement) {
      const tableElement =
        shiftTableContainer.nativeElement.querySelector('table') ||
        shiftTableContainer.nativeElement;
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
    // Own teardown first: saveCurrentFilter reaches into another service, and if it ever throws, the
    // subscriptions below would never be released. Persisting the filter is the less critical of the two.
    this.destroy$.next();
    this.destroy$.complete();

    this.allShiftStateService.saveCurrentFilter();
  }

  private setupTableResize(): void {
    setTimeout(() => {
      const shiftTableContainer = this.shiftTableContainer();
      if (!shiftTableContainer?.nativeElement) return;

      const tableElement =
        shiftTableContainer.nativeElement.querySelector('table') ||
        shiftTableContainer.nativeElement;

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
              this.cdr.markForCheck();
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
              this.cdr.markForCheck();
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
        this.cdr.markForCheck();
      }, 300);
    }
  }

  /**
   * Reloads which of the containers now on screen Klacksy's remediation already handled.
   *
   * Hangs off onExternalFilterChange rather than off readPage because the view radio in the nav bar
   * calls the service directly and never goes through this component - hooking readPage would miss
   * exactly the moment the user switches to the container view. The service fires the callback after
   * every read, so pagination, search and the resize-driven reads are covered by the same hook.
   *
   * Only the container view can show the marker at all: containers appear under no other filter. Every
   * other view clears the map instead of keeping a stale one from the last container page.
   */
  private readProactiveAttributions(): void {
    const request = ++this.proactiveAttributionRequest;

    if (this.dataManagementShiftService.currentFilter.filterType !== ShiftFilterType.Container) {
      this.proactiveAttributions.set(new Map());
      return;
    }

    const entityIds = this.dataManagementShiftService.shifts
      .map((shift) => shift.id)
      .filter((id): id is string => !!id);

    this.dataProactiveAttributionService
      .getByEntityIds(entityIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe((attributions) => {
        if (request !== this.proactiveAttributionRequest) {
          return;
        }

        this.proactiveAttributions.set(
          new Map(attributions.map((attribution) => [attribution.entityId, attribution]))
        );
        this.cdr.markForCheck();
      });
  }

  private recalculateTableHeight(): void {
    if (!this.tableResizeService.isAutoMode()) {
      return;
    }

    const shiftTableContainer = this.shiftTableContainer();
    if (!shiftTableContainer?.nativeElement) {
      return;
    }

    if (this.dataManagementShiftService.currentFilter.searchString) {
      return;
    }

    const tableElement =
      shiftTableContainer.nativeElement.querySelector('table') ||
      shiftTableContainer.nativeElement;

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
        this.cdr.markForCheck();
      }, 500);
    }
  }
}
