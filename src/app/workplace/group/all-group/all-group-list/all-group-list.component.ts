/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  EffectRef,
  ElementRef,
  EventEmitter,
  Injector,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  ViewChild,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NgbPaginationModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { CheckBoxValue } from 'src/app/core/client-class';
import { IGroup, IGroupFilter } from 'src/app/core/group-class';
import {
  HeaderDirection,
  HeaderProperties,
} from 'src/app/core/headerProperties';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { ResizeTableDirective } from 'src/app/directives/resize-table.directive';

import { MessageLibrary } from 'src/app/helpers/string-constants';
import { IconTreeComponent } from 'src/app/icons/icon-tree.component';
import { PencilIconGreyComponent } from 'src/app/icons/pencil-icon-grey.component';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';
import { ModalService, ModalType } from 'src/app/modal/modal.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { SpinnerService } from 'src/app/spinner/spinner.service';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { TableResizeService } from 'src/app/services/table-resize.service';
import { AllGroupStateService } from '../services/all-group-state.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-all-group-list',
  templateUrl: './all-group-list.component.html',
  styleUrls: ['./all-group-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbTooltipModule,
    NgbPaginationModule,
    TranslateModule,
    PencilIconGreyComponent,
    TrashIconRedComponent,
    IconTreeComponent,
    ResizeTableDirective,
    PaginationComponent,
  ],
  providers: [TableResizeService, AllGroupStateService],
})
export class AllGroupListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(ResizeTableDirective, { static: false })
  resizeDirective!: ResizeTableDirective;
  @ViewChild('myGridTable', { static: true }) myGridTable:
    | ElementRef
    | undefined;

  @Output() switchToTree = new EventEmitter<void>();

  public dataManagementGroupService = inject(DataManagementGroupService);
  public translate = inject(TranslateService);
  private spinnerService = inject(SpinnerService);
  private navigationService = inject(NavigationService);
  private modalService = inject(ModalService);
  private injector = inject(Injector);
  private tableResizeService = inject(TableResizeService);
  private allGroupStateService = inject(AllGroupStateService);
  private localStorageService = inject(LocalStorageService);

  private effectRef: EffectRef | null = null;

  highlightRowId: string | undefined = undefined;
  page = 1;
  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;

  private tmplateArrowDown = '↓';
  private tmplateArrowUp = '↑';
  private tmplateArrowUndefined = '↕';

  arrowName = '';
  arrowValidFrom = '';
  arrowValidUntil = '';
  arrowDescription = '';

  nameHeader: HeaderProperties = new HeaderProperties();
  validFromHeader: HeaderProperties = new HeaderProperties();
  validUntilHeader: HeaderProperties = new HeaderProperties();
  descriptionHeader: HeaderProperties = new HeaderProperties();

  orderBy = 'name';
  sortOrder = 'asc';

  message = MessageLibrary.DELETE_ENTRY;
  checkBoxIndeterminate = false;
  isAuthorised = false;
  monthList = [];
  isFirstRead = true;

  resizeWindow: (() => void) | undefined;

  private ngUnsubscribe = new Subject<void>();

  ngOnInit(): void {
    this.dataManagementGroupService.init();
    this.allGroupStateService.initializeWorkplaceState();
    this.reReadSortData();

    this.readSignals();
  }

  ngAfterViewInit(): void {
    this.getReset();

    this.modalService.resultEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: ModalType) => {
        if (x === ModalType.Delete) {
          this.deleteGroup(this.modalService.Filing);
        }
      });

    setTimeout(() => {
      if (this.resizeDirective) {
        this.resizeDirective.recalcHeight();
      }
      this.setupTableResize();
    }, 100);

    setTimeout(() => (this.spinnerService.showProgressSpinner = false), 300);
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

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
    let sortOrder = '';

    if (orderBy === 'name') {
      this.nameHeader.DirectionSwitch();

      if (this.nameHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.nameHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    } else if (orderBy === 'description') {
      this.descriptionHeader.DirectionSwitch();

      if (this.descriptionHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.descriptionHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    } else if (orderBy === 'valid_from') {
      this.validFromHeader.DirectionSwitch();

      if (this.validFromHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.validFromHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    } else if (orderBy === 'valid_until') {
      this.validUntilHeader.DirectionSwitch();

      if (this.validUntilHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.validUntilHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    }

    this.sort(orderBy, sortOrder);
    this.readPage();
  }

  onAddGroup() {
    this.dataManagementGroupService.createGroup();
  }

  onClickToggle() {
    this.switchToTree.emit();
  }

  private sort(orderBy: string, sortOrder: string) {
    this.orderBy = orderBy;
    this.sortOrder = sortOrder;
    this.setHeaderArrowToUndefined();
    this.setDirection(sortOrder, this.setPosition(orderBy)!);
    this.setHeaderArrowTemplate();
  }

  private setPosition(orderBy: string): HeaderProperties | undefined {
    if (orderBy === 'name') {
      return this.nameHeader;
    }
    if (orderBy === 'description') {
      return this.descriptionHeader;
    }
    if (orderBy === 'valid_from') {
      return this.validFromHeader;
    }
    if (orderBy === 'valid_until') {
      return this.validUntilHeader;
    }

    return undefined;
  }

  private setDirection(sortOrder: string, value: HeaderProperties): void {
    if (sortOrder === 'asc') {
      value.order = HeaderDirection.Down;
    }
    if (sortOrder === 'desc') {
      value.order = HeaderDirection.Up;
    }
  }

  private setHeaderArrowTemplate() {
    this.arrowName = this.setHeaderArrowTemplateSub(this.nameHeader);
    this.arrowDescription = this.setHeaderArrowTemplateSub(
      this.descriptionHeader
    );
    this.arrowValidFrom = this.setHeaderArrowTemplateSub(this.validFromHeader);
    this.arrowValidUntil = this.setHeaderArrowTemplateSub(
      this.validUntilHeader
    );
  }

  private setHeaderArrowTemplateSub(value: HeaderProperties): string {
    switch (value.order) {
      case HeaderDirection.Down:
        return this.tmplateArrowDown;
      case HeaderDirection.Up:
        return this.tmplateArrowUp;
      case HeaderDirection.None:
        return ''; // this.tmplateArrowUndefined;
    }
  }

  private reReadSortData() {
    this.sort(this.orderBy, this.sortOrder);
  }

  private setHeaderArrowToUndefined() {
    this.nameHeader.order = HeaderDirection.None;
    this.validFromHeader.order = HeaderDirection.None;
    this.validUntilHeader.order = HeaderDirection.None;
    this.descriptionHeader.order = HeaderDirection.None;
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
      this.orderBy,
      this.sortOrder,
      this.page,
      this.firstItemOnLastPage,
      this.isPreviousPage,
      this.isNextPage
    );
  }
  private restoreFilter(value: IGroupFilter) {
    // This method is now handled by AllGroupStateService
    // Keeping for backward compatibility if needed
  }
  onClickEdit(data: IGroup) {
    this.allGroupStateService.saveCurrentFilter();
    this.dataManagementGroupService.prepareGroup(data);
    this.navigationService.navigateToEditGroup(data.id);
  }

  onChangeRowSize(event: any): void {
    const value = +event.srcElement.value;
    this.page = 1;

    if (value === -1 && this.myGridTable?.nativeElement) {
      const optimalRows = this.tableResizeService.calculateOptimalRowCount(
        this.myGridTable.nativeElement
      );
      this.dataManagementGroupService.currentFilter.numberOfItemsPerPage =
        optimalRows;
      this.allGroupStateService.saveAutoModeItemsPerPage(optimalRows);
    } else {
      this.dataManagementGroupService.currentFilter.numberOfItemsPerPage =
        value;
    }

    this.resizeDirective?.onRowSizeChange(value);
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
    }, 100);
  }

  onClickedRow(value: IGroup) {
    this.highlightRowId = value.id;
  }

  /* #region   MsgBox */

  open(data: IGroup) {
    this.modalService.Filing = data.id!;
    this.modalService.deleteMessage = this.message;
    this.modalService.setDefault(ModalType.Delete);
    this.modalService.openModel(ModalType.Delete);
  }

  /* #endregion   MsgBox */

  private deleteGroup(id: string) {
    this.dataManagementGroupService
      .deleteGroup(id)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.readPage();
      });
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      this.effectRef = effect(() => {
        const isRead = this.dataManagementGroupService.isRead();
        if (isRead) {
          const storedRowOrder =
            this.localStorageService.get('SELECTED_ROW_ORDER');
          if (
            storedRowOrder === '-1' &&
            this.isFirstRead &&
            this.dataManagementGroupService.currentFilter.numberOfItemsPerPage >
              0 &&
            !this.dataManagementGroupService.currentFilter.searchString
          ) {
            this.allGroupStateService.saveAutoModeItemsPerPage(
              this.dataManagementGroupService.currentFilter.numberOfItemsPerPage
            );
          }

          if (this.isFirstRead) {
            this.isFirstRead = false;
          } else {
            this.resizeDirective?.triggerMeasurement();
          }
        }

        const initIsRead = this.dataManagementGroupService.initIsRead();
        if (initIsRead) {
          this.isInit();
        }
      });
    });
  }

  private isInit(): void {
    const wasRestored = this.allGroupStateService.restoreFilterFromStorage();

    if (wasRestored) {
      setTimeout(() => {
        this.page =
          this.dataManagementGroupService.currentFilter.requiredPage + 1;
        this.readPage();
      }, 100);
    }
  }

  private setupTableResize(): void {
    if (!this.myGridTable?.nativeElement) return;

    this.tableResizeService
      .createResizeObservable(this.myGridTable.nativeElement)
      .pipe(takeUntil(this.ngUnsubscribe))
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
          }
        }
      });
  }
}
