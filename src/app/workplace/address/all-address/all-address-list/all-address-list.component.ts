/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  EffectRef,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CheckBoxValue, IClient, IFilter } from 'src/app/core/client-class';
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
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ModalService, ModalType } from 'src/app/modal/modal.service';
import { Subject, takeUntil } from 'rxjs';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';
import { ExcelComponent } from 'src/app/icons/excel.component';
import { PencilIconGreyComponent } from 'src/app/icons/pencil-icon-grey.component';
import { NavigationService } from 'src/app/services/navigation.service';
import { IconEyeGreyComponent } from 'src/app/icons/icon-eye.component';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { ResizeTableDirective } from 'src/app/directives/resize-table.directive';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';

@Component({
  selector: 'app-all-address-list',
  templateUrl: './all-address-list.component.html',
  styleUrls: ['./all-address-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbPaginationModule,
    TrashIconRedComponent,
    PencilIconGreyComponent,
    ExcelComponent,
    IconEyeGreyComponent,
    ResizeTableDirective,
    PaginationComponent,
  ],
})
export class AllAddressListComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  // @ViewChild properties
  @ViewChild(ResizeTableDirective, { static: false })
  resizeDirective!: ResizeTableDirective;
  @ViewChild('myAddressTable', { static: true }) myAddressTable:
    | ElementRef
    | undefined;

  // Public injected services
  public authorizationService = inject(AuthorizationService);
  public dataManagementClientService = inject(DataManagementClientService);
  public translate = inject(TranslateService);

  // Private injected services
  private injector = inject(Injector);
  private localStorageService = inject(LocalStorageService);
  private modalService = inject(ModalService);
  private navigationService = inject(NavigationService);

  // Public properties (used in templates)
  public arrowCompany = '';
  public arrowFirstName = '';
  public arrowName = '';
  public arrowNo = '';
  public arrowStatus = '';
  public checkBoxIndeterminate = false;
  public companyHeader: HeaderProperties = new HeaderProperties();
  public firstItemOnLastPage: number | undefined = undefined;
  public firstNameHeader: HeaderProperties = new HeaderProperties();
  public highlightRowId: string | undefined = undefined;
  public isAuthorised = false;
  public isFirstRead = true;
  public isNextPage: boolean | undefined = undefined;
  public isPreviousPage: boolean | undefined = undefined;
  public message = MessageLibrary.DELETE_ENTRY;
  public monthList = [];
  public nameHeader: HeaderProperties = new HeaderProperties();
  public numberHeader: HeaderProperties = new HeaderProperties();
  public numberOfItemsPerPage = 5;
  public numberOfItemsPerPageMap = new Map();
  public orderBy = 'name';
  public page = 1;
  public realRow = -1;
  public sortOrder = 'asc';
  public statusHeader: HeaderProperties = new HeaderProperties();

  // Private properties
  private effects: EffectRef[] = [];
  private ngUnsubscribe = new Subject<void>();
  private tmplateArrowDown = '↓';
  private tmplateArrowUp = '↑';

  // Lifecycle hooks
  ngOnInit(): void {
    this.dataManagementClientService.init();
    if (this.localStorageService.get(MessageLibrary.TOKEN_AUTHORISED)) {
      this.isAuthorised = JSON.parse(
        this.localStorageService.get(MessageLibrary.TOKEN_AUTHORISED)!
      );
    }

    this.reReadSortData();
    this.readSignals();
  }

  ngAfterViewInit(): void {
    this.translate.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.message = this.translate.instant('DELETE_ENTRY');
      });

    setTimeout(() => {
      if (this.resizeDirective) {
        this.resizeDirective.recalcHeight();
      }
    }, 100);

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

    this.effects.forEach((effectRef) => {
      if (effectRef) {
        effectRef.destroy();
      }
    });
    this.effects = [];
  }

  // Public methods

  onAddAddress(): void {
    this.dataManagementClientService.createClient();
  }

  onChangeCheckBox(i: number, value: any): void {
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

  onChangeHeaderCheckBox(): void {
    this.dataManagementClientService.clearCheckedArray();
  }

  onChangeRowSize(event: any): void {
    const value = +event.srcElement.value;
    this.page = 1;

    this.resizeDirective?.onRowSizeChange(value);
    this.readPage();
  }

  onClickEdit(data: IClient): void {
    saveFilter(this.dataManagementClientService.currentFilter, 'edit-address');
    this.dataManagementClientService.prepareClient(data);
    this.navigationService.navigateToEditAddress(data.id);
  }

  onClickExportExcel(index: number): void {
    if (
      this.dataManagementClientService.headerCheckBoxValue ||
      this.checkBoxIndeterminate
    ) {
      this.dataManagementClientService.exportExcel(index);
    }
  }

  onClickHeader(orderBy: string): void {
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

  onClickedRow(value: IClient): void {
    this.highlightRowId = value.id;
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

  onItemsPerPageChange(value: number): void {
    this.dataManagementClientService.currentFilter.numberOfItemsPerPage = value;
    this.readPage();
  }

  onLostFocus(): void {
    this.highlightRowId = undefined;
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

      this.firstItemOnLastPage =
        this.dataManagementClientService.paginationDataService.firstItem;
    } else if (event === this.page - 1) {
      this.isPreviousPage = true;
      this.firstItemOnLastPage =
        this.dataManagementClientService.paginationDataService.firstItem;
    }
    this.page = event;
    setTimeout(() => {
      this.readPage();
    }, 100);
  }

  onRecalculateRequired(shouldRead: boolean): void {
    if (shouldRead) {
      this.readPage(true);
    } else {
      this.readPage();
    }
  }

  open(data: IClient): void {
    this.modalService.Filing = data.id!;
    this.modalService.deleteMessage = this.message;
    this.modalService.setDefault(ModalType.Delete);
    this.modalService.openModel(ModalType.Delete);
  }

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

  setLastChangeMetaData(): void {
    // Sub-Headline Beschriftung
    this.dataManagementClientService.getLastChangeMetaData(
      this.translate.currentLang
    );
  }

  // Private methods

  private isInit(): void {
    const tmp = restoreFilter('edit-address');

    // Row size is now handled by PaginationComponent

    this.setLastChangeMetaData();

    if (!tmp) {
      this.dataManagementClientService.currentFilter.setEmpty();
    } else {
      setTimeout(() => {
        this.restoreFilter(tmp);
        this.page =
          this.dataManagementClientService.currentFilter.requiredPage + 1;
      }, 100);
    }
  }

  private readPage(isSecondRead = false): void {
    this.setFilter();
    this.dataManagementClientService.readPage(isSecondRead);
  }

  private setFilter(): void {
    this.dataManagementClientService.currentFilter.orderBy = this.orderBy;
    this.dataManagementClientService.currentFilter.sortOrder = this.sortOrder;
    this.dataManagementClientService.currentFilter.requiredPage = this.page - 1;
    this.dataManagementClientService.currentFilter.firstItemOnLastPage =
      this.firstItemOnLastPage;
    this.dataManagementClientService.currentFilter.isPreviousPage =
      this.isPreviousPage;
    this.dataManagementClientService.currentFilter.isNextPage = this.isNextPage;
  }

  private restoreFilter(value: IFilter): void {
    const filter = cloneObject<IFilter>(
      this.dataManagementClientService.currentFilter
    );
    copyObjectValues(this.dataManagementClientService.currentFilter, value);

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

  private deleteClient(id: string): void {
    this.dataManagementClientService
      .deleteClient(id)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.readPage();
        this.setLastChangeMetaData();
      });
  }

  private readSignals(): void {
    const readEffect = runInInjectionContext(this.injector, () => {
      return effect(() => {
        if (this.dataManagementClientService.isRead()) {
          if (this.isFirstRead) {
            this.isFirstRead = false;
          } else {
            this.resizeDirective?.triggerMeasurement();
          }
        }
      });
    });
    this.effects.push(readEffect);

    const initEffect = runInInjectionContext(this.injector, () => {
      return effect(() => {
        const initIsRead = this.dataManagementClientService.initIsRead();
        if (initIsRead) {
          this.isInit();
        }
      });
    });
    this.effects.push(initEffect);
  }

  private sort(orderBy: string, sortOrder: string): void {
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

  private setHeaderArrowTemplate(): void {
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

  private reReadSortData(): void {
    this.sort(this.orderBy, this.sortOrder);
  }

  private setHeaderArrowToUndefined(): void {
    this.firstNameHeader.order = HeaderDirection.None;
    this.numberHeader.order = HeaderDirection.None;
    this.companyHeader.order = HeaderDirection.None;
    this.nameHeader.order = HeaderDirection.None;
    this.statusHeader.order = HeaderDirection.None;
  }
}
