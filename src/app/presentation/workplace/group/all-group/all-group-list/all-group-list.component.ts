// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  DestroyRef,
  EffectRef,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  Renderer2,
  effect,
  inject,
  runInInjectionContext,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  output,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import {
  NgbPaginationModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { CheckBoxValue } from 'src/app/domain/models/client/client-class';
import { IGroup } from 'src/app/domain/models/group/group-class';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { ResizeTableDirective } from 'src/app/presentation/directives/resize-table.directive';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { IconTreeComponent } from 'src/app/presentation/icons/icon-tree.component';
import { PencilIconGreyComponent } from 'src/app/presentation/icons/pencil-icon-grey.component';
import { IconCopyGreyComponent } from 'src/app/presentation/icons/icon-copy-grey.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { SpinnerService } from 'src/app/presentation/spinner/spinner.service';
import { QuickPrintActionService } from 'src/app/presentation/services/quick-print-action.service';
import { PaginationComponent } from 'src/app/presentation/shared/pagination/pagination.component';
import { TableResizeService } from 'src/app/presentation/services/table-resize.service';
import { AllGroupStateService } from '../services/all-group-state.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';

@Component({
  selector: 'app-all-group-list',
  templateUrl: './all-group-list.component.html',
  styleUrls: ['./all-group-list.component.scss'],
  standalone: true,
  imports: [
    DatePipe,
    NgbTooltipModule,
    NgbPaginationModule,
    TranslateModule,
    PencilIconGreyComponent,
    IconCopyGreyComponent,
    TrashIconRedComponent,
    IconTreeComponent,
    PdfIconComponent,
    ResizeTableDirective,
    PaginationComponent,
  ],
  providers: [TableResizeService, AllGroupStateService, TableSortingService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllGroupListComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly resizeDirective = viewChild.required(ResizeTableDirective);
  readonly myGridTable = viewChild<ElementRef>('myGridTable');

  readonly switchToTree = output<void>();

  public dataManagementGroupService = inject(DataManagementGroupService);
  public sortingService = inject(TableSortingService);
  public quickPrintAction = inject(QuickPrintActionService);
  private spinnerService = inject(SpinnerService);
  private navigationService = inject(NavigationService);
  private modalService = inject(ModalService);
  private injector = inject(Injector);
  private tableResizeService = inject(TableResizeService);
  private allGroupStateService = inject(AllGroupStateService);
  private localStorageService = inject(LocalStorageService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  private effectRef: EffectRef | null = null;

  highlightRowId: string | undefined = undefined;
  page = 1;
  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;

  message = DomainMessages.DELETE_ENTRY;
  checkBoxIndeterminate = false;
  isAuthorised = false;
  monthList = [];
  isFirstRead = true;
  isQuickPrinting = false;
  readonly detailQuickPrintSourceId = 'edit-group';

  resizeWindow: (() => void) | undefined;

  async ngOnInit(): Promise<void> {
    this.dataManagementGroupService.init();
    await this.allGroupStateService.initializeWorkplaceState();

    this.sortingService.initialize({
      columns: ['name', 'description', 'valid_from', 'valid_until'],
      defaultOrderBy: 'name',
      defaultSortOrder: 'asc',
      useThreeWaySort: true,
    });

    this.readSignals();

    const wasRestored =
      await this.allGroupStateService.restoreFilterFromStorage();
    if (wasRestored) {
      this.page =
        this.dataManagementGroupService.currentFilter.requiredPage + 1;
    }
    this.readPage();
    this.cdr.markForCheck();

    await this.quickPrintAction.ensureDefaultsLoaded();
    this.cdr.markForCheck();
  }

  ngAfterViewInit(): void {
    this.getReset();

    this.modalService.resultEvent
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'all-group-list'
        ) {
          this.deleteGroup(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
        this.cdr.markForCheck();
      });

    setTimeout(() => {
      const resizeDirective = this.resizeDirective();
      if (resizeDirective) {
        resizeDirective.recalcHeight();
      }
      this.setupTableResize();
    }, 100);

    setTimeout(() => {
      this.spinnerService.showProgressSpinner = false;
      this.cdr.markForCheck();
    }, 300);
  }

  ngOnDestroy(): void {
    this.allGroupStateService.saveCurrentFilter();

    try {
      if (this.resizeWindow) {
        this.resizeWindow();
      }
    } catch {
      this.resizeWindow = undefined;
    }

    if (this.effectRef) {
      this.effectRef.destroy();
      this.effectRef = null;
    }
  }

  /* #region   header */

  onClickHeader(orderBy: string) {
    this.sortingService.onHeaderClick(orderBy, () => this.readPage());
  }

  onAddGroup() {
    this.dataManagementGroupService.createGroup();
    this.navigationService.navigateToEditGroup();
  }

  onClickToggle() {
    this.switchToTree.emit();
  }

  async onClickQuickPrint(): Promise<void> {
    if (this.isQuickPrinting) {
      return;
    }

    this.isQuickPrinting = true;
    this.cdr.markForCheck();

    try {
      await this.quickPrintAction.print({
        sourceId: 'group',
        fallbackDataSetIds: ['groups'],
        params: { groupFilter: this.dataManagementGroupService.currentFilter },
      });
    } finally {
      this.isQuickPrinting = false;
      this.cdr.markForCheck();
    }
  }

  async onClickQuickPrintDetail(group: IGroup, event: Event): Promise<void> {
    event.stopPropagation();
    if (!group.id || this.isQuickPrinting) {
      return;
    }

    this.isQuickPrinting = true;
    this.cdr.markForCheck();

    try {
      await this.quickPrintAction.print({
        sourceId: this.detailQuickPrintSourceId,
        fallbackDataSetIds: ['details'],
        params: { groupId: group.id },
        groupName: group.name,
      });
    } finally {
      this.isQuickPrinting = false;
      this.cdr.markForCheck();
    }
  }

  /* #endregion   header */

  /* #region   CheckBox */

  checkBoxValue(i: number): boolean {
    try {
      const tmpClient = this.dataManagementGroupService.listWrapper!.groups[i];
      const tmpCheckBoxValue =
        this.dataManagementGroupService.findCheckBoxValue(tmpClient.id!);

      if (this.dataManagementGroupService.headerCheckBoxValue === true) {
        if (tmpCheckBoxValue) {
          return tmpCheckBoxValue.checked;
        }
        return true;
      }

      if (tmpCheckBoxValue) {
        return tmpCheckBoxValue.checked;
      }
    } finally {
      this.checkBoxIndeterminate =
        this.dataManagementGroupService.checkBoxIndeterminate();
    }
    return false;
  }

  onChangeCheckBox(i: number, value: any) {
    try {
      const isChecked = value.currentTarget.checked;
      const tmpClient = this.dataManagementGroupService.listWrapper!.groups[i];
      const tmpCheckBoxValue =
        this.dataManagementGroupService.findCheckBoxValue(tmpClient.id!);

      if (tmpCheckBoxValue) {
        tmpCheckBoxValue.checked = isChecked;
      } else {
        const c = new CheckBoxValue();
        c.id = tmpClient.id!;
        c.checked = isChecked;
        this.dataManagementGroupService.addCheckBoxValueToArray(c);
      }
    } finally {
      this.checkBoxIndeterminate =
        this.dataManagementGroupService.checkBoxIndeterminate();
    }
  }

  onChangeHeaderCheckBox() {
    this.dataManagementGroupService.clearCheckedArray();
  }

  /* #endregion   CheckBox */

  /* #region   resize */

  onItemsPerPageChange(value: number): void {
    if (this.dataManagementGroupService.currentFilter.searchString) {
      return;
    }

    this.dataManagementGroupService.currentFilter.numberOfItemsPerPage = value;
    this.readPage();
  }

  onRecalculateRequired(shouldRead: boolean): void {
    if (shouldRead) {
      this.readPage(true);
    } else {
      this.readPage();
    }
  }

  private getReset(): void {
    this.page = 1;
    this.dataManagementGroupService.currentFilter.firstItemOnLastPage = 0;
    this.dataManagementGroupService.currentFilter.isPreviousPage = undefined;
    this.dataManagementGroupService.currentFilter.isNextPage = undefined;
  }

  /* #endregion   resize */

  onLostFocus() {
    this.highlightRowId = undefined;
  }

  private readPage(isSecondRead = false): void {
    this.setFilter();
    this.dataManagementGroupService.readPage(isSecondRead);
  }

  private setFilter(): void {
    this.allGroupStateService.prepareFilterForRequest(
      this.sortingService.getCurrentOrderBy(),
      this.sortingService.getCurrentSortOrder(),
      this.page,
      this.firstItemOnLastPage,
      this.isPreviousPage,
      this.isNextPage
    );
  }

  onClickEdit(data: IGroup) {
    this.allGroupStateService.saveCurrentFilter();
    this.dataManagementGroupService.prepareGroup(data);
    this.navigationService.navigateToEditGroup(data.id);
  }

  onCopyGroup(data: IGroup): void {
    this.allGroupStateService.saveCurrentFilter();
    const copiedGroup = cloneObject<IGroup>(data);
    copiedGroup.id = '';
    copiedGroup.name = `${copiedGroup.name}-copy`;

    if (copiedGroup.groupItems) {
      copiedGroup.groupItems.forEach((item) => {
        item.id = undefined;
        item.groupId = undefined;
      });
    }

    this.dataManagementGroupService.prepareGroup(copiedGroup);
    this.navigationService.navigateToEditGroup();
  }

  onChangeRowSize(event: any): void {
    const value = +event.srcElement.value;
    this.page = 1;

    const myGridTable = this.myGridTable();
    if (value === -1 && myGridTable?.nativeElement) {
      const optimalRows = this.tableResizeService.calculateOptimalRowCount(
        myGridTable.nativeElement
      );
      this.dataManagementGroupService.currentFilter.numberOfItemsPerPage =
        optimalRows;
    } else {
      this.dataManagementGroupService.currentFilter.numberOfItemsPerPage =
        value;
    }

    this.resizeDirective()?.onRowSizeChange(value);
    this.readPage();
  }

  onPageChange(event: number): void {
    this.firstItemOnLastPage = undefined;
    this.isPreviousPage = undefined;
    this.isNextPage = undefined;

    if (event === this.page + 1) {
      this.isNextPage = true;
      this.firstItemOnLastPage =
        this.dataManagementGroupService.paginationDataService.firstItem;
    } else if (event === this.page - 1) {
      this.isPreviousPage = true;
      this.firstItemOnLastPage =
        this.dataManagementGroupService.paginationDataService.firstItem;
    }

    this.page = event;
    setTimeout(() => {
      this.readPage();
      this.cdr.markForCheck();
    }, 100);
  }

  onClickedRow(value: IGroup) {
    this.highlightRowId = value.id;
  }

  open(data: IGroup) {
    this.modalService.Filing = '';
    this.modalService.componentContext = 'all-group-list';

    this.modalService.Filing = data.id!;
    this.modalService.deleteMessage = this.message;
    this.modalService.setDefault(ModalType.Delete);
    this.modalService.openModel(ModalType.Delete);
  }

  private deleteGroup(id: string) {
    this.dataManagementGroupService
      .deleteGroup(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.readPage();
        this.cdr.markForCheck();
      });
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      this.effectRef = effect(() => {
        const isRead = this.dataManagementGroupService.isRead();
        if (isRead) {
          if (this.isFirstRead) {
            this.isFirstRead = false;
          } else {
            this.resizeDirective()?.triggerMeasurement();
          }
        }
      });
    });
  }

  private setupTableResize(): void {
    const myGridTable = this.myGridTable();
    if (!myGridTable?.nativeElement) return;

    this.tableResizeService
      .createResizeObservable(myGridTable.nativeElement)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((optimalRows: number) => {
        if (this.tableResizeService.isAutoMode()) {
          const currentRows =
            this.dataManagementGroupService.currentFilter.numberOfItemsPerPage;

          if (this.dataManagementGroupService.currentFilter.searchString) {
            return;
          }

          if (!this.allGroupStateService.isResizeCalculationAllowed()) {
            return;
          }

          if (Math.abs(currentRows - optimalRows) >= 1) {
            this.dataManagementGroupService.currentFilter.numberOfItemsPerPage =
              optimalRows;
            this.page = 1;
            this.readPage();
            this.cdr.markForCheck();
          }
        }
      });
  }
}
