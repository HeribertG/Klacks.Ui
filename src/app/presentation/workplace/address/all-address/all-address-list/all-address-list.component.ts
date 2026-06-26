// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  EffectRef,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  effect,
  inject,
  runInInjectionContext,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  viewChild
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CheckBoxValue, IClient } from 'src/app/domain/models/client/client-class';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { Subject, takeUntil } from 'rxjs';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { ExcelComponent } from 'src/app/presentation/icons/excel.component';
import { PencilIconGreyComponent } from 'src/app/presentation/icons/pencil-icon-grey.component';
import { IconEyeGreyComponent } from 'src/app/presentation/icons/icon-eye.component';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ResizeTableDirective } from 'src/app/presentation/directives/resize-table.directive';
import { PaginationComponent } from 'src/app/presentation/shared/pagination/pagination.component';
import { TableResizeService } from 'src/app/presentation/services/table-resize.service';
import { AllAddressStateService } from '../services/all-address-state.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';

@Component({
  selector: 'app-all-address-list',
  templateUrl: './all-address-list.component.html',
  styleUrls: ['./all-address-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    NgbPaginationModule,
    TrashIconRedComponent,
    PencilIconGreyComponent,
    ExcelComponent,
    IconEyeGreyComponent,
    ResizeTableDirective,
    PaginationComponent,
  ],
  providers: [TableResizeService, AllAddressStateService, TableSortingService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllAddressListComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  // @ViewChild properties
  readonly resizeDirective = viewChild.required(ResizeTableDirective);
  readonly myAddressTable = viewChild<ElementRef>('myAddressTable');

  public authorizationService = inject(AuthorizationService);
  public dataManagementClientService = inject(DataManagementClientService);
  public translate = inject(TranslateService);
  public sortingService = inject(TableSortingService);

  private injector = inject(Injector);
  private localStorageService = inject(LocalStorageService);
  private modalService = inject(ModalService);
  private tableResizeService = inject(TableResizeService);
  private allAddressStateService = inject(AllAddressStateService);
  private navigationService = inject(NavigationService);
  private cdr = inject(ChangeDetectorRef);

  public checkBoxIndeterminate = false;
  public firstItemOnLastPage: number | undefined = undefined;
  public highlightRowId: string | undefined = undefined;
  public isAuthorised = false;
  public isFirstRead = true;
  public isNextPage: boolean | undefined = undefined;
  public isPreviousPage: boolean | undefined = undefined;
  public message = DomainMessages.DELETE_ENTRY;
  public monthList = [];
  public numberOfItemsPerPage = 5;
  public numberOfItemsPerPageMap = new Map();
  public page = 1;
  public realRow = -1;

  public headerCheckBoxValue = signal(false);

  // Private properties
  private effects: EffectRef[] = [];
  private ngUnsubscribe = new Subject<void>();

  // Lifecycle hooks
  async ngOnInit(): Promise<void> {
    if (this.localStorageService.get(StorageKeys.TOKEN_AUTHORISED)) {
      this.isAuthorised = JSON.parse(
        this.localStorageService.get(StorageKeys.TOKEN_AUTHORISED)!
      );
    }

    this.sortingService.initialize({
      columns: ['idNumber', 'company', 'firstName', 'name', 'status'],
      defaultOrderBy: 'name',
      defaultSortOrder: 'asc',
      useThreeWaySort: false,
    });

    this.readSignals();

    this.setLastChangeMetaData();
    const wasRestored =
      await this.allAddressStateService.restoreFilterFromStorage();
    if (wasRestored) {
      this.page =
        this.dataManagementClientService.currentFilter.requiredPage + 1;
    }
    this.readPage();
    this.cdr.markForCheck();
  }

  ngAfterViewInit(): void {
    this.translate.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.message = this.translate.instant('DELETE_ENTRY');
        this.cdr.markForCheck();
      });

    setTimeout(() => {
      const resizeDirective = this.resizeDirective();
      if (resizeDirective) {
        resizeDirective.recalcHeight();
      }
      this.setupTableResize();
    }, 100);

    this.modalService.resultEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'all-address-list'
        ) {
          this.deleteClient(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.allAddressStateService.saveCurrentFilter();

    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    this.effects.forEach((effectRef) => {
      if (effectRef) {
        effectRef.destroy();
      }
    });
    this.effects = [];
  }

  onAddAddress(): void {
    this.navigationService.navigateToEditAddress();
  }

  onChangeCheckBox(i: number, value: any): void {
    try {
      const isChecked = value.currentTarget.checked;
      const tmpClient =
        this.dataManagementClientService.listWrapper()!.clients[i];
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

  onChangeHeaderCheckBox(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.headerCheckBoxValue.set(checked);
    this.dataManagementClientService.clientListService.headerCheckBoxValue.set(checked);
    this.dataManagementClientService.clearCheckedArray();
  }

  onChangeRowSize(event: any): void {
    const value = +event.srcElement.value;
    this.page = 1;

    const myAddressTable = this.myAddressTable();
    if (value === -1 && myAddressTable?.nativeElement) {
      const optimalRows = this.tableResizeService.calculateOptimalRowCount(
        myAddressTable.nativeElement
      );
      this.dataManagementClientService.currentFilter.numberOfItemsPerPage =
        optimalRows;
    } else {
      this.dataManagementClientService.currentFilter.numberOfItemsPerPage =
        value;
    }

    this.resizeDirective()?.onRowSizeChange(value);
    this.readPage();
  }

  onClickEdit(data: IClient): void {
    this.allAddressStateService.saveCurrentFilter();
    this.navigationService.navigateToEditAddress(data.id!);
  }

  onClickExportExcel(index: number): void {
    if (
      this.dataManagementClientService.headerCheckBoxValue() ||
      this.checkBoxIndeterminate
    ) {
      this.dataManagementClientService.exportExcel(index);
    }
  }

  onClickHeader(orderBy: string): void {
    this.sortingService.onHeaderClick(orderBy, () => this.readPage());
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
      this.dataManagementClientService.currentFilter.scopeFrom !== null &&
      this.dataManagementClientService.currentFilter.scopeUntil !== null;

    return tmp;
  }

  onItemsPerPageChange(value: number): void {
    if (this.dataManagementClientService.currentFilter.searchString) {
      return;
    }

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
        this.dataManagementClientService.paginationDataService()?.firstItem;
    } else if (event === this.page - 1) {
      this.isPreviousPage = true;
      this.firstItemOnLastPage =
        this.dataManagementClientService.paginationDataService()?.firstItem;
    }
    this.page = event;
    setTimeout(() => {
      this.readPage();
      this.cdr.markForCheck();
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
    this.modalService.Filing = '';
    this.modalService.componentContext = 'all-address-list';

    this.modalService.Filing = data.id!;
    this.modalService.deleteMessage = this.message;
    this.modalService.setDefault(ModalType.Delete);
    this.modalService.openModel(ModalType.Delete);
  }

  checkBoxValue(i: number): boolean {
    try {
      const tmpClient =
        this.dataManagementClientService.listWrapper()!.clients[i];
      const tmpCheckBoxValue =
        this.dataManagementClientService.findCheckBoxValue(tmpClient.id!);

      if (this.dataManagementClientService.headerCheckBoxValue() === true) {
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
    this.dataManagementClientService.getLastChangeMetaData(
      this.translate.currentLang
    );
  }

  private readPage(isSecondRead = false): void {
    this.setFilter();
    this.dataManagementClientService.readPage(isSecondRead);
  }

  private setFilter(): void {
    this.allAddressStateService.prepareFilterForRequest(
      this.sortingService.getCurrentOrderBy(),
      this.sortingService.getCurrentSortOrder(),
      this.page,
      this.firstItemOnLastPage,
      this.isPreviousPage,
      this.isNextPage
    );
  }

  private deleteClient(id: string): void {
    this.dataManagementClientService
      .deleteClient(id)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.readPage();
        this.setLastChangeMetaData();
        this.cdr.markForCheck();
      });
  }

  private readSignals(): void {
    const readEffect = runInInjectionContext(this.injector, () => {
      return effect(() => {
        if (this.dataManagementClientService.isRead()) {
          this.localStorageService.get(DomainMessages.SELECTED_ROW_ORDER);

          if (this.isFirstRead) {
            this.isFirstRead = false;
          } else {
            this.resizeDirective()?.triggerMeasurement();
          }
        }
      });
    });
    this.effects.push(readEffect);
  }

  private setupTableResize(): void {
    const myAddressTable = this.myAddressTable();
    if (!myAddressTable?.nativeElement) return;

    this.tableResizeService
      .createResizeObservable(myAddressTable.nativeElement)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((optimalRows: number) => {
        if (this.tableResizeService.isAutoMode()) {
          const currentRows =
            this.dataManagementClientService.currentFilter.numberOfItemsPerPage;

          if (this.dataManagementClientService.currentFilter.searchString) {
            return;
          }

          if (!this.allAddressStateService.isResizeCalculationAllowed()) {
            return;
          }

          if (Math.abs(currentRows - optimalRows) >= 1) {
            this.dataManagementClientService.currentFilter.numberOfItemsPerPage =
              optimalRows;
            this.page = 1;
            this.readPage();
            this.cdr.markForCheck();
          }
        }
      });
  }
}
