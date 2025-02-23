import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
  effect,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { CheckBoxValue } from 'src/app/core/client-class';
import { IGroup, IGroupFilter } from 'src/app/core/group-class';
import {
  HeaderDirection,
  HeaderProperties,
} from 'src/app/core/headerProperties';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import {
  cloneObject,
  compareComplexObjects,
  copyObjectValues,
  restoreFilter,
  saveFilter,
} from 'src/app/helpers/object-helpers';
import { visibleRow } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { measureTableHeight } from 'src/app/helpers/tableResize';
import { ModalService, ModalType } from 'src/app/modal/modal.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { SpinnerService } from 'src/app/spinner/spinner.service';

@Component({
    selector: 'app-all-group-list',
    templateUrl: './all-group-list.component.html',
    styleUrls: ['./all-group-list.component.scss'],
    standalone: false
})
export class AllGroupListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('myGridTable', { static: true }) myGridTable:
    | ElementRef
    | undefined;

  highlightRowId: string | undefined = undefined;
  page = 1;
  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;

  numberOfItemsPerPage = 5;
  numberOfItemsPerPageMap = new Map();

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

  tableSize: DOMRectReadOnly | any;
  isMeasureTable = false;
  isFirstRead = true;

  visibleRow: { text: string; value: number }[] = [];
  realRow = -1;

  resizeWindow: (() => void) | undefined;

  private ngUnsubscribe = new Subject<void>();

  constructor(
    public dataManagementGroupService: DataManagementGroupService,
    private spinnerService: SpinnerService,
    private router: Router,
    private renderer: Renderer2,
    private translateService: TranslateService,
    private localStorageService: LocalStorageService,
    private modalService: ModalService
  ) {
    effect(
      () => {
        const isRead = this.dataManagementGroupService.isRead();
        if (isRead) {
          if (this.isFirstRead) {
            setTimeout(() => this.recalcHeight(), 100);
            this.isFirstRead = false;
            return;
          }
          this.isMeasureTable = true;
        }
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
    const tmp = restoreFilter('edit-group');
    this.visibleRow = visibleRow();
    this.dataManagementGroupService.init;

    if (!tmp) {
      this.dataManagementGroupService.currentFilter.setEmpty();
      this.recalcHeight();
    } else {
      setTimeout(() => {
        this.restoreFilter(tmp);
        this.page =
          this.dataManagementGroupService.currentFilter.requiredPage + 1;
        this.recalcHeight();
      }, 100);
    }
  }

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: ModalType) => {
        if (x === ModalType.Delete) {
          this.deleteGroup(this.modalService.Filing);
        }
      });

    setTimeout(() => (this.spinnerService.showProgressSpinner = false), 300);
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
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

  private getReset(): void {
    this.page = 1;
    this.dataManagementGroupService.currentFilter.firstItemOnLastPage = 0;
    this.dataManagementGroupService.currentFilter.isPreviousPage = undefined;
    this.dataManagementGroupService.currentFilter.isNextPage = undefined;

    setTimeout(() => this.recalcHeight(), 100);
  }

  onResize(event: DOMRectReadOnly | any): void {
    this.tableSize = event;
    if (this.isMeasureTable) {
      this.isMeasureTable = false;
      setTimeout(() => this.recalcHeight(true), 100);
    }
  }

  private resize = (event: any): void => {
    setTimeout(() => this.recalcHeight(), 100);
  };

  private recalcHeight(isSecondRead: boolean = false) {
    if (this.myGridTable) {
      const addLine = measureTableHeight(this.myGridTable);

      const tmpNumberOfItemsPerPage = this.numberOfItemsPerPage;

      if (
        this.page * addLine!.lines <
        this.dataManagementGroupService.maxItems
      ) {
        this.numberOfItemsPerPage = 5;
        if (addLine!.lines > 5) {
          this.numberOfItemsPerPage = addLine!.lines;
        }
      }

      if (!isSecondRead) {
        this.readPage();
      } else {
        if (tmpNumberOfItemsPerPage !== this.numberOfItemsPerPage) {
          this.readPage(true);
        }
      }
    }
  }

  /* #endregion   resize */

  onLostFocus() {
    this.highlightRowId = undefined;
  }

  private readPage(isSecondRead: boolean = false) {
    if (!isSecondRead) {
      const lastNumberOfItemsPerPage = this.numberOfItemsPerPageMap.get(
        this.page
      );
      if (lastNumberOfItemsPerPage) {
        this.dataManagementGroupService.currentFilter.numberOfItemOnPreviousPage =
          undefined;
        this.dataManagementGroupService.currentFilter.numberOfItemOnPreviousPage =
          lastNumberOfItemsPerPage;
      }
    }
    if (this.realRow === -1) {
      this.setFilter();
      this.dataManagementGroupService.readPage(isSecondRead);
    } else {
      this.firstItemOnLastPage = 0;
      this.isPreviousPage = undefined;
      this.isNextPage = undefined;
      this.setFilter();
      this.numberOfItemsPerPage = this.realRow;
      this.dataManagementGroupService.currentFilter.numberOfItemsPerPage =
        this.numberOfItemsPerPage;
      this.dataManagementGroupService.readPage(true);
    }
  }

  private setFilter() {
    this.dataManagementGroupService.currentFilter.orderBy = this.orderBy;
    this.dataManagementGroupService.currentFilter.sortOrder = this.sortOrder;
    this.dataManagementGroupService.currentFilter.requiredPage = this.page - 1;
    this.dataManagementGroupService.currentFilter.numberOfItemsPerPage =
      this.numberOfItemsPerPage;
    this.dataManagementGroupService.currentFilter.firstItemOnLastPage =
      this.firstItemOnLastPage;
    this.dataManagementGroupService.currentFilter.isPreviousPage =
      this.isPreviousPage;
    this.dataManagementGroupService.currentFilter.isNextPage = this.isNextPage;
  }
  private restoreFilter(value: IGroupFilter) {
    const filter = cloneObject<IGroupFilter>(
      this.dataManagementGroupService.currentFilter
    );
    copyObjectValues(this.dataManagementGroupService.currentFilter, value);

    if (this.dataManagementGroupService.currentFilter.searchString) {
      this.dataManagementGroupService.restoreSearch.set(
        this.dataManagementGroupService.currentFilter.searchString
      );
    }

    if (
      !compareComplexObjects(
        filter,
        this.dataManagementGroupService.currentFilter
      )
    ) {
      this.readPage();
    }
  }
  onClickEdit(data: IGroup) {
    saveFilter(this.dataManagementGroupService.currentFilter, 'edit-group');
    this.dataManagementGroupService.prepareGroup(data);
    this.router.navigate(['/workplace/edit-group']);
  }

  onChangeRowSize(event: any): void {
    this.realRow = +event.srcElement.value;
    this.dataManagementGroupService.firstItem = 0;
    this.page = 1;
    localStorage.removeItem(MessageLibrary.SELECTED_ROW_ORDER);
    localStorage.setItem(
      MessageLibrary.SELECTED_ROW_ORDER,
      this.realRow.toString()
    );

    if (this.realRow !== -1) {
      this.numberOfItemsPerPage = this.realRow;
      this.dataManagementGroupService.maxPages = 0;
      this.dataManagementGroupService.maxItems = 0;
    }

    setTimeout(() => this.recalcHeight(), 100);
  }

  onPageChange(event: number) {
    this.firstItemOnLastPage = undefined;
    this.isPreviousPage = undefined;
    this.isNextPage = undefined;
    if (event === this.page + 1) {
      this.isNextPage = true;
      if (!this.numberOfItemsPerPageMap.get(this.page)) {
        this.numberOfItemsPerPageMap.set(this.page, this.numberOfItemsPerPage);
      }
      this.firstItemOnLastPage = this.dataManagementGroupService.firstItem;
    } else if (event === this.page - 1) {
      this.isPreviousPage = true;
      this.firstItemOnLastPage = this.dataManagementGroupService.firstItem;
    }
    this.page = event;
    setTimeout(() => {
      this.recalcHeight();
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

  private readSignals(): void {}
}
