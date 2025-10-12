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
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';

import { Subject, takeUntil } from 'rxjs';
import { Absence, IAbsence } from 'src/app/domain/models/absence-class';
import {
  HeaderDirection,
  HeaderProperties,
} from 'src/app/domain/models/headerProperties';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';
import { DataManagementAbsenceService } from 'src/app/domain/services/absence/data-management-absence.service';
import { cloneObject } from 'src/app/domain/helpers/object-helpers';
import { Language } from 'src/app/application/helpers/sharedItems';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { IconCopyGreyComponent } from 'src/app/presentation/icons/icon-copy-grey.component';
import { PencilIconGreyComponent } from 'src/app/presentation/icons/pencil-icon-grey.component';
import { ExcelComponent } from 'src/app/presentation/icons/excel.component';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { SimplePaginationComponent } from 'src/app/presentation/shared/simple-pagination/simple-pagination.component';

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
    SpinnerModule,
    TrashIconRedComponent,
    IconCopyGreyComponent,
    PencilIconGreyComponent,
    ExcelComponent,
    FallbackPipe,
    SimplePaginationComponent,
  ],
})
export class AbsenceComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(NgForm, { static: false }) absenceForm: NgForm | undefined;

  public dataManagementAbsenceService = inject(DataManagementAbsenceService);

  private modalService = inject(ModalService);
  private ngbModal = inject(NgbModal);
  private translate = inject(TranslateService);

  public arrowDescription = '';
  public arrowName = '';
  public currentAbsence = new Absence();
  public currentLang: Language = MessageLibrary.DEFAULT_LANG;
  public descriptionHeader = new HeaderProperties();
  public firstItemOnLastPage: number | undefined = undefined;
  public highlightRowId: string | undefined = undefined;
  public isComboBoxOpen = false;
  public isNextPage: boolean | undefined = undefined;
  public isPreviousPage: boolean | undefined = undefined;
  public message = MessageLibrary.DELETE_ENTRY;
  public nameHeader = new HeaderProperties();
  public numberOfItemsPerPage = 7;
  public numberOfItemsPerPageMap = new Map<number, number>();
  public orderBy = 'name';
  public page = 1;
  public sortOrder = 'asc';

  private ngUnsubscribe = new Subject<void>();
  private tmplateArrowDown = '↓';
  private tmplateArrowUp = '↑';

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
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'absence'
        ) {
          this.deleteAbsence(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  createNewAbsence(content: any): void {
    this.currentAbsence = new Absence();
    this.currentAbsence.name = new MultiLanguage();
    this.currentAbsence.description = new MultiLanguage();
    this.openNewAbsence(content);
  }

  onClickDownloadExcel(): void {}

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

  onClickedRow(value: IAbsence): void {
    this.highlightRowId = value.id;
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

  openDeleteAbsence(data: IAbsence): void {
    if (data.id) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'absence';

      this.modalService.Filing = data.id;
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
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

  private reReadSortData(): void {
    this.sort(this.orderBy, this.sortOrder);
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

  private setHeaderArrowToUndefined(): void {
    this.nameHeader.order = HeaderDirection.None;
    this.descriptionHeader.order = HeaderDirection.None;
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
}
