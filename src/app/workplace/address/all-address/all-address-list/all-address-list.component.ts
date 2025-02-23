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
import {
  CheckBoxValue,
  Filter,
  IClient,
  IFilter,
} from 'src/app/core/client-class';
import {
  HeaderDirection,
  HeaderProperties,
} from 'src/app/core/headerProperties';
import { DataManagementClientService } from 'src/app/data/management/data-management-client.service';
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
import { isNumeric } from 'src/app/helpers/format-helper';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ModalService, ModalType } from 'src/app/modal/modal.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-all-address-list',
    templateUrl: './all-address-list.component.html',
    styleUrls: ['./all-address-list.component.scss'],
    standalone: false
})
export class AllAddressListComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('myAddressTable', { static: true }) myAddressTable:
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

  arrowNo = '';
  arrowCompany = '';
  arrowFirstName = '';
  arrowName = '';
  arrowStatus = '';

  numberHeader: HeaderProperties = new HeaderProperties();
  companyHeader: HeaderProperties = new HeaderProperties();
  firstNameHeader: HeaderProperties = new HeaderProperties();
  nameHeader: HeaderProperties = new HeaderProperties();
  statusHeader: HeaderProperties = new HeaderProperties();

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
    public dataManagementClientService: DataManagementClientService,
    private router: Router,
    private renderer: Renderer2,
    private translateService: TranslateService,
    private localStorageService: LocalStorageService,
    private modalService: ModalService
  ) {
    this.readSignals();
  }

  ngOnInit(): void {
    this.dataManagementClientService.init();
    if (this.localStorageService.get(MessageLibrary.TOKEN_AUTHORISED)) {
      this.isAuthorised = JSON.parse(
        this.localStorageService.get(MessageLibrary.TOKEN_AUTHORISED)!
      );
    }

    this.reReadSortData();
    this.visibleRow = visibleRow();

    window.addEventListener('resize', this.resize, true);
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.message = this.translateService.instant('DELETE_ENTRY');
      });

    setTimeout(() => this.recalcHeight(), 600);

    this.getReset();

    this.resizeWindow = this.renderer.listen('window', 'resize', (event) => {
      this.resize(event);
    });

    this.modalService.resultEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: ModalType) => {
        if (x === ModalType.Delete) {
          this.deleteClient(this.modalService.Filing);
        }
      });
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
  }

  private isInit(): void {
    const tmp = restoreFilter('edit-address');

    const tmpRow = this.localStorageService.get(
      MessageLibrary.SELECTED_ROW_ORDER
    );
    if (tmpRow && isNumeric(tmpRow)) {
      setTimeout(() => (this.realRow = +tmpRow), 100);
    }

    this.setLastChangeMetaData();

    if (!tmp) {
      this.dataManagementClientService.currentFilter.setEmpty();
      this.recalcHeight();
    } else {
      setTimeout(() => {
        this.restoreFilter(tmp);
        this.page =
          this.dataManagementClientService.currentFilter.requiredPage + 1;
        this.recalcHeight();
      }, 100);
    }
  }

  /* #region   resize */

  private getReset(): void {
    this.page = 1;
    this.dataManagementClientService.currentFilter.firstItemOnLastPage = 0;
    this.dataManagementClientService.currentFilter.isPreviousPage = undefined;
    this.dataManagementClientService.currentFilter.isNextPage = undefined;

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
    if (this.myAddressTable) {
      const addLine = measureTableHeight(this.myAddressTable);

      const tmpNumberOfItemsPerPage = this.numberOfItemsPerPage;

      if (
        this.page * addLine!.lines <
        this.dataManagementClientService.maxItems
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

  onClickedRow(value: IClient) {
    this.highlightRowId = value.id;
  }

  onClickExportExcel(index: number) {
    if (
      this.dataManagementClientService.headerCheckBoxValue ||
      this.checkBoxIndeterminate
    ) {
      this.dataManagementClientService.exportExcel(index);
    }
  }

  onLostFocus() {
    this.highlightRowId = undefined;
  }

  onChangeRowSize(event: any): void {
    this.realRow = +event.srcElement.value;
    this.dataManagementClientService.firstItem = 0;
    this.page = 1;
    localStorage.removeItem(MessageLibrary.SELECTED_ROW_ORDER);
    localStorage.setItem(
      MessageLibrary.SELECTED_ROW_ORDER,
      this.realRow.toString()
    );

    if (this.realRow !== -1) {
      this.numberOfItemsPerPage = this.realRow;
      this.dataManagementClientService.maxPages = 0;
      this.dataManagementClientService.maxItems = 0;
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

      this.firstItemOnLastPage = this.dataManagementClientService.firstItem;
    } else if (event === this.page - 1) {
      this.isPreviousPage = true;
      this.firstItemOnLastPage = this.dataManagementClientService.firstItem;
    }
    this.page = event;
    setTimeout(() => {
      this.recalcHeight();
    }, 100);
  }

  private readPage(isSecondRead: boolean = false) {
    if (!isSecondRead) {
      const lastNumberOfItemsPerPage = this.numberOfItemsPerPageMap.get(
        this.page
      );
      if (lastNumberOfItemsPerPage) {
        this.dataManagementClientService.currentFilter.numberOfItemOnPreviousPage =
          undefined;
        this.dataManagementClientService.currentFilter.numberOfItemOnPreviousPage =
          lastNumberOfItemsPerPage;
      }
    }

    if (this.realRow === -1) {
      this.setFilter();
      this.dataManagementClientService.readPage(isSecondRead);
    } else {
      this.firstItemOnLastPage = 0;
      this.isPreviousPage = undefined;
      this.isNextPage = undefined;
      this.setFilter();
      this.numberOfItemsPerPage = this.realRow;
      this.dataManagementClientService.currentFilter.numberOfItemsPerPage =
        this.numberOfItemsPerPage;
      this.dataManagementClientService.readPage(true);
    }
  }

  private setFilter() {
    this.dataManagementClientService.currentFilter.orderBy = this.orderBy;
    this.dataManagementClientService.currentFilter.sortOrder = this.sortOrder;
    this.dataManagementClientService.currentFilter.requiredPage = this.page - 1;
    this.dataManagementClientService.currentFilter.numberOfItemsPerPage =
      this.numberOfItemsPerPage;
    this.dataManagementClientService.currentFilter.firstItemOnLastPage =
      this.firstItemOnLastPage;
    this.dataManagementClientService.currentFilter.isPreviousPage =
      this.isPreviousPage;
    this.dataManagementClientService.currentFilter.isNextPage = this.isNextPage;
  }
  private restoreFilter(value: IFilter) {
    const filter = cloneObject<IFilter>(
      this.dataManagementClientService.currentFilter
    );
    copyObjectValues(this.dataManagementClientService.currentFilter, value);

    const countriesArray =
      this.dataManagementClientService.currentFilter.countries;

    if (this.dataManagementClientService.currentFilter.searchString) {
      this.dataManagementClientService.restoreSearch.set(
        this.dataManagementClientService.currentFilter.searchString
      );
    }

    if (
      !compareComplexObjects(
        filter,
        this.dataManagementClientService.currentFilter
      )
    ) {
      this.readPage();
    }
  }

  onClickEdit(data: IClient) {
    saveFilter(this.dataManagementClientService.currentFilter, 'edit-address');
    this.dataManagementClientService.prepareClient(data);
    this.router.navigate(['/workplace/edit-address']);
  }

  setLastChangeMetaData() {
    // Sub-Headline Beschriftung
    this.dataManagementClientService.getLastChangeMetaData(
      this.translateService.currentLang
    );
  }

  onFluctuationEnabled(): boolean {
    const tmp =
      this.dataManagementClientService.currentFilter.scopeFromFlag !== null &&
      this.dataManagementClientService.currentFilter.scopeUntilFlag !== null &&
      this.dataManagementClientService.currentFilter.internalScopeFrom !==
        null &&
      this.dataManagementClientService.currentFilter.internalScopeUntil !==
        null;

    return tmp;
  }

  onDataCategory(data: IClient): string {
    const res = this.dataManagementClientService.clientAttribute.find(
      (x) => +x.type === +data.type
    );
    if (res) {
      return res.name.substring(0, 1);
    }
    return '';
  }

  /* #region   header */

  onClickHeader(orderBy: string) {
    let sortOrder = '';

    if (orderBy === 'firstName') {
      this.firstNameHeader.DirectionSwitch();

      if (this.firstNameHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.firstNameHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    } else if (orderBy === 'idNumber') {
      this.numberHeader.DirectionSwitch();

      if (this.numberHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.numberHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    } else if (orderBy === 'company') {
      this.companyHeader.DirectionSwitch();

      if (this.companyHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.companyHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    } else if (orderBy === 'name') {
      this.nameHeader.DirectionSwitch();

      if (this.nameHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.nameHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    } else if (orderBy === 'status') {
      this.statusHeader.DirectionSwitch();

      if (this.statusHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.statusHeader.order === HeaderDirection.Up) {
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
    if (orderBy === 'firstName') {
      return this.firstNameHeader;
    }
    if (orderBy === 'idNumber') {
      return this.numberHeader;
    }
    if (orderBy === 'company') {
      return this.companyHeader;
    }
    if (orderBy === 'name') {
      return this.nameHeader;
    }
    if (orderBy === 'status') {
      return this.statusHeader;
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
    this.arrowFirstName = this.setHeaderArrowTemplateSub(this.firstNameHeader);
    this.arrowCompany = this.setHeaderArrowTemplateSub(this.companyHeader);
    this.arrowNo = this.setHeaderArrowTemplateSub(this.numberHeader);
    this.arrowName = this.setHeaderArrowTemplateSub(this.nameHeader);
    this.arrowStatus = this.setHeaderArrowTemplateSub(this.statusHeader);
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
    this.firstNameHeader.order = HeaderDirection.None;
    this.numberHeader.order = HeaderDirection.None;
    this.companyHeader.order = HeaderDirection.None;
    this.nameHeader.order = HeaderDirection.None;
    this.statusHeader.order = HeaderDirection.None;
  }

  /* #endregion   header */

  /* #region   CheckBox */

  checkBoxValue(i: number): boolean {
    try {
      const tmpClient =
        this.dataManagementClientService.listWrapper!.clients[i];
      const tmpCheckBoxValue =
        this.dataManagementClientService.findCheckBoxValue(tmpClient.id!);

      if (this.dataManagementClientService.headerCheckBoxValue === true) {
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
        this.dataManagementClientService.checkBoxIndeterminate();
    }
    return false;
  }

  onChangeCheckBox(i: number, value: any) {
    try {
      const isChecked = value.currentTarget.checked;
      const tmpClient =
        this.dataManagementClientService.listWrapper!.clients[i];
      const tmpCheckBoxValue =
        this.dataManagementClientService.findCheckBoxValue(tmpClient.id!);

      if (tmpCheckBoxValue) {
        tmpCheckBoxValue.checked = isChecked;
      } else {
        const c = new CheckBoxValue();
        c.id = tmpClient.id!;
        c.checked = isChecked;
        this.dataManagementClientService.addCheckBoxValueToArray(c);
      }
    } finally {
      this.checkBoxIndeterminate =
        this.dataManagementClientService.checkBoxIndeterminate();
    }
  }

  onChangeHeaderCheckBox() {
    this.dataManagementClientService.clearCheckedArray();
  }

  /* #endregion   CheckBox */

  /* #region   MsgBox */

  open(data: IClient) {
    this.modalService.Filing = data.id!;
    this.modalService.deleteMessage = this.message;
    this.modalService.setDefault(ModalType.Delete);
    this.modalService.openModel(ModalType.Delete);
  }

  /* #endregion   MsgBox */

  private deleteClient(id: string) {
    this.dataManagementClientService
      .deleteClient(id)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.readPage();
        this.setLastChangeMetaData();
      });
  }

  private readSignals(): void {
    effect(
      () => {
        if (this.dataManagementClientService.isRead()) {
          if (this.isFirstRead) {
            setTimeout(() => this.recalcHeight(), 100);
            this.isFirstRead = false;
          } else {
            this.isMeasureTable = true;
          }
        }

        const initIsRead = this.dataManagementClientService.initIsRead();
        if (initIsRead) {
          this.isInit();
        }
      },
      { allowSignalWrites: true }
    );
  }
}
