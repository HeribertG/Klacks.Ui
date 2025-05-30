/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  NgbModal,
  NgbModule,
  NgbPaginationModule,
} from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from 'src/app/shared/shared.module';
import { SpinnerModule } from 'src/app/spinner/spinner.module';

import { Subject, takeUntil } from 'rxjs';
import { Absence, IAbsence } from 'src/app/core/absence-class';
import {
  HeaderDirection,
  HeaderProperties,
} from 'src/app/core/headerProperties';
import { MultiLanguage } from 'src/app/core/multi-language-class';
import { DataManagementAbsenceService } from 'src/app/data/management/data-management-absence.service';
import { cloneObject } from 'src/app/helpers/object-helpers';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { ModalService, ModalType } from 'src/app/modal/modal.service';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';
import { IconCopyGreyComponent } from 'src/app/icons/icon-copy-grey.component';
import { PencilIconGreyComponent } from 'src/app/icons/pencil-icon-grey.component';
import { ExcelComponent } from 'src/app/icons/excel.component';

@Component({
  selector: 'app-absence',
  templateUrl: './absence.component.html',
  styleUrls: ['./absence.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbModule,
    NgbPaginationModule,
    SharedModule,
    SpinnerModule,
    TrashIconRedComponent,
    IconCopyGreyComponent,
    PencilIconGreyComponent,
    ExcelComponent,
  ],
})
export class AbsenceComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(NgForm, { static: false }) absenceForm: NgForm | undefined;

  public dataManagementAbsenceService = inject(DataManagementAbsenceService);
  private modalService = inject(ModalService);
  private ngbModal = inject(NgbModal);
  private translate = inject(TranslateService);

  // Pagination properties
  highlightRowId: string | undefined = undefined;
  page = 1;
  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;
  numberOfItemsPerPage = 7;
  numberOfItemsPerPageMap = new Map<number, number>();

  // Sorting properties
  private tmplateArrowDown = '↓';
  private tmplateArrowUp = '↑';
  arrowName = '';
  arrowDescription = '';
  orderBy = 'name';
  sortOrder = 'asc';

  nameHeader = new HeaderProperties();
  descriptionHeader = new HeaderProperties();

  currentLang: Language = MessageLibrary.DEFAULT_LANG;
  currentAbsence = new Absence();
  message = MessageLibrary.DELETE_ENTRY;
  isComboBoxOpen = false;

  private ngUnsubscribe = new Subject<void>();

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang as Language;
    this.reReadSortData();
    this.readPage();
  }

  ngAfterViewInit(): void {
    this.translate.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translate.currentLang as Language;
      });

    this.modalService.resultEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: ModalType) => {
        if (x === ModalType.Delete) {
          this.deleteAbsence(this.modalService.Filing);
        }
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private readPage(): void {
    const filter = this.dataManagementAbsenceService.currentFilter;

    filter.firstItemOnLastPage = this.firstItemOnLastPage;
    filter.isPreviousPage = this.isPreviousPage;
    filter.isNextPage = this.isNextPage;

    filter.orderBy = this.orderBy;
    filter.sortOrder = this.sortOrder;

    filter.requiredPage = this.page - 1;
    filter.numberOfItemsPerPage = this.numberOfItemsPerPage;

    this.dataManagementAbsenceService.readPage(this.currentLang);
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

      this.firstItemOnLastPage = this.dataManagementAbsenceService.firstItem;
    } else if (event === this.page - 1) {
      this.isPreviousPage = true;
      this.firstItemOnLastPage = this.dataManagementAbsenceService.firstItem;
    }

    setTimeout(() => {
      this.readPage();
    }, 200);
  }

  onClickedRow(value: IAbsence): void {
    this.highlightRowId = value.id;
  }

  onClickDownloadExcel() {}

  /* #region Filter */
  onOpenChange(event: boolean): void {
    this.isComboBoxOpen = event;
    if (this.isComboBoxOpen) {
      this.dataManagementAbsenceService.setTemporaryFilter();
    }
    if (
      !this.isComboBoxOpen &&
      this.dataManagementAbsenceService.isTemoraryFilter_Dirty()
    ) {
      setTimeout(() => {
        this.readPage();
      }, 100);
    }
  }
  /* #endregion Filter */

  /* #region MsgBox */
  openDeleteAbsence(data: IAbsence): void {
    if (data.id) {
      this.modalService.Filing = data.id;
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  onCopyAbsence(content: any, data: Absence): void {
    this.currentAbsence = cloneObject<Absence>(data);
    this.currentAbsence.id = undefined;

    this.openNewAbsence(content);
  }

  onEditAbsence(content: any, data: Absence): void {
    this.currentAbsence = data;
    this.openNewAbsence(content);
  }

  createNewAbsence(content: any): void {
    this.currentAbsence = new Absence();
    this.currentAbsence.name = new MultiLanguage();
    this.currentAbsence.description = new MultiLanguage();
    this.openNewAbsence(content);
  }

  openNewAbsence(content: any): void {
    this.ngbModal
      .open(content, {
        size: 'md',
        centered: true,
        windowClass: 'custom-class',
        ariaLabelledBy: 'modal-edit',
      })
      .result.then(
        () => {
          if (this.currentAbsence.id) {
            this.dataManagementAbsenceService.updateAbsence(
              this.currentAbsence,
              this.currentLang
            );
          } else {
            delete this.currentAbsence.id;
            this.dataManagementAbsenceService.addAbsence(
              this.currentAbsence,
              this.currentLang
            );
          }
        },
        () => {}
      );
  }

  private deleteAbsence(id: string): void {
    this.dataManagementAbsenceService.deleteAbsence(id, this.currentLang);
  }
  /* #endregion MsgBox */

  /* #region header */
  onClickHeader(orderBy: string): void {
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
    }

    this.sort(orderBy, sortOrder);
    this.readPage();
  }

  private sort(orderBy: string, sortOrder: string): void {
    this.orderBy = orderBy;
    this.sortOrder = sortOrder;
    this.setHeaderArrowToUndefined();
    const header = this.setPosition(orderBy);
    if (header) {
      this.setDirection(sortOrder, header);
    }
    this.setHeaderArrowTemplate();
  }

  private setPosition(orderBy: string): HeaderProperties | undefined {
    if (orderBy === 'name') {
      return this.nameHeader;
    }

    if (orderBy === 'description') {
      return this.descriptionHeader;
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
    this.arrowName = this.setHeaderArrowTemplateSub(this.nameHeader);
    this.arrowDescription = this.setHeaderArrowTemplateSub(
      this.descriptionHeader
    );
  }

  private setHeaderArrowTemplateSub(value: HeaderProperties): string {
    switch (value.order) {
      case HeaderDirection.Down:
        return this.tmplateArrowDown;
      case HeaderDirection.Up:
        return this.tmplateArrowUp;
      case HeaderDirection.None:
        return '';
    }
  }

  private reReadSortData(): void {
    this.sort(this.orderBy, this.sortOrder);
  }

  private setHeaderArrowToUndefined(): void {
    this.nameHeader.order = HeaderDirection.None;
    this.descriptionHeader.order = HeaderDirection.None;
  }
  /* #endregion header */
}
