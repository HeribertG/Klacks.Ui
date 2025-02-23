import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
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

@Component({
    selector: 'app-absence',
    templateUrl: './absence.component.html',
    styleUrls: ['./absence.component.scss'],
    standalone: false
})
export class AbsenceComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(NgForm, { static: false }) absenceForm: NgForm | undefined;

  highlightRowId: string | undefined = undefined;
  page = 1;
  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;

  numberOfItemsPerPage = 7;
  numberOfItemsPerPageMap = new Map();

  private tmplateArrowDown = '↓';
  private tmplateArrowUp = '↑';
  private tmplateArrowUndefined = '↕';

  arrowName = '';
  arrowDescription = '';

  orderBy = 'name';
  sortOrder = 'asc';

  currentLang: Language = MessageLibrary.DEFAULT_LANG;

  currentAbsence = new Absence();

  message = MessageLibrary.DELETE_ENTRY;

  nameHeader: HeaderProperties = new HeaderProperties();
  descriptionHeader: HeaderProperties = new HeaderProperties();

  objectForUnsubscribe: any;

  isComboBoxOpen = false;

  private ngUnsubscribe = new Subject<void>();

  constructor(
    public dataManagementAbsenceService: DataManagementAbsenceService,
    private ngbModal: NgbModal,
    private translateService: TranslateService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
    this.reReadSortData();
    this.readPage();
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
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

  private readPage() {
    this.dataManagementAbsenceService.currentFilter.firstItemOnLastPage =
      this.firstItemOnLastPage;
    this.dataManagementAbsenceService.currentFilter.isPreviousPage =
      this.isPreviousPage;
    this.dataManagementAbsenceService.currentFilter.isNextPage =
      this.isNextPage;

    this.dataManagementAbsenceService.currentFilter.orderBy = this.orderBy;
    this.dataManagementAbsenceService.currentFilter.sortOrder = this.sortOrder;
    this.dataManagementAbsenceService.currentFilter.requiredPage =
      this.page - 1;
    this.dataManagementAbsenceService.currentFilter.numberOfItemsPerPage =
      this.numberOfItemsPerPage;

    this.dataManagementAbsenceService.readPage(this.currentLang);
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

      this.firstItemOnLastPage = this.dataManagementAbsenceService.firstItem;
    } else if (event === this.page - 1) {
      this.isPreviousPage = true;
      this.firstItemOnLastPage = this.dataManagementAbsenceService.firstItem;
    }

    setTimeout(() => {
      this.readPage();
    }, 200);
  }

  onClickedRow(value: IAbsence) {
    this.highlightRowId = value.id;
  }

  onClickDownloadExcel() {
    this.dataManagementAbsenceService.exportExcel(this.currentLang);
  }

  /* #region Filter */
  onOpenChange(event: boolean) {
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
  /* #region   MsgBox */

  openDeleteAbsence(data: IAbsence) {
    this.modalService.Filing = data.id!;
    this.modalService.deleteMessage = this.message;
    this.modalService.setDefault(ModalType.Delete);
    this.modalService.openModel(ModalType.Delete);
  }

  onCopyAbsence(content: any, data: Absence) {
    this.currentAbsence = cloneObject<Absence>(data);
    this.currentAbsence.id = undefined;

    this.openNewAbsence(content);
  }

  onEditAbsence(content: any, data: Absence) {
    this.currentAbsence = data;

    this.openNewAbsence(content);
  }

  createNewAbsence(content: any) {
    this.currentAbsence = new Absence();
    this.currentAbsence.name = new MultiLanguage();
    this.currentAbsence.description = new MultiLanguage();
    this.openNewAbsence(content);
  }

  openNewAbsence(content: any) {
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

          // this.isChangingEvent.emit(true);
        },
        () => {}
      );
  }

  private deleteAbsence(id: string): void {
    this.dataManagementAbsenceService.deleteAbsence(id, this.currentLang);
  }
  /* #endregion   MsgBox */

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
    this.descriptionHeader.order = HeaderDirection.None;
  }

  /* #endregion   header */
}
