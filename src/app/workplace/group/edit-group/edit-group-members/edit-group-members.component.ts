/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  inject,
  LOCALE_ID,
  OnInit,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CheckBoxValue, IClient } from 'src/app/core/client-class';
import { IGroupItem } from 'src/app/core/group-class';
import {
  HeaderDirection,
  HeaderProperties,
} from 'src/app/core/headerProperties';
import { DataClientService } from 'src/app/data/data-client.service';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { GroupSelectionService } from 'src/app/data/management/group-selection.service';
import { isNumeric } from 'src/app/helpers/format-helper';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { ToastShowService } from 'src/app/toast/toast-show.service';

@Component({
  selector: 'app-edit-group-members',
  templateUrl: './edit-group-members.component.html',
  styleUrls: ['./edit-group-members.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IconAngleDownComponent,
    IconAngleRightComponent,
    TrashIconRedComponent,
  ],
})
export class EditGroupMembersComponent implements OnInit, AfterViewInit {
  public authorizationService = inject(AuthorizationService);
  public dataManagementGroupService = inject(DataManagementGroupService);
  public toastShowService = inject(ToastShowService);
  public groupSelectionService = inject(GroupSelectionService);
  private locale: string = inject(LOCALE_ID);
  private dataClientService = inject(DataClientService);
  private cdr = inject(ChangeDetectorRef);

  @Output() isChangingEvent = new EventEmitter();
  @Output() isEnterEvent = new EventEmitter();

  result = new Array<IClient>();
  selectedClientName = '';
  selectedClient: IClient | undefined = undefined;

  page = 1;
  visibleTable = 'inline';

  private tmplateArrowDown = '↓';
  private tmplateArrowUp = '↑';
  private tmplateArrowUndefined = '↕';

  arrowNo = '';
  arrowCompany = '';
  arrowFirstName = '';
  arrowName = '';

  numberHeader: HeaderProperties = new HeaderProperties();
  companyHeader: HeaderProperties = new HeaderProperties();
  firstNameHeader: HeaderProperties = new HeaderProperties();
  nameHeader: HeaderProperties = new HeaderProperties();

  checkBoxIndeterminate = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  @HostListener('search', ['$event']) onsearch(event: any) {
    if (!this.selectedClientName) {
      this.clearSelection();
      return;
    }
  }

  ngOnInit(): void {
    this.locale = MessageLibrary.DEFAULT_LANG;

    this.setFilter();
  }

  ngAfterViewInit(): void {
    this.reReadSortData();
    this.cdr.detectChanges();
  }

  private clearSelection() {
    this.selectedClient = undefined;
    this.selectedClientName = '';
    this.result = [];
  }

  onIsChanging(event: any) {
    this.isChangingEvent.emit(event);
  }
  onKeyupSearchField(event: KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'Enter') {
      this.applyClient();
    }

    if (isNumeric(this.selectedClientName)) {
      this.searchText(true);
      return;
    }

    if (this.selectedClientName && this.selectedClientName.length >= 3) {
      this.searchText();
      return;
    }

    setTimeout(() => {
      this.searchText();
    }, 2000);
  }

  onKeydownEnterSearchField(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      if (isNumeric(this.selectedClientName)) {
        this.searchText(true);
        return;
      }

      this.applyClient();
    }
  }

  onClickApply() {
    this.applyClient();
  }

  private searchText(isNumer = false) {
    if (
      this.selectedClientName &&
      (this.selectedClientName.toString().length >= 2 || isNumer)
    ) {
      const split = this.selectedClientName.toString().split(' - ');

      if (split.length >= 1 && isNumeric(split[0])) {
        this.refreshList(split[0]);
      } else {
        this.refreshList(this.selectedClientName);
      }
    }
  }

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  private refreshList(term: string) {
    this.dataManagementGroupService.currentClientFilter.searchString = term;

    this.dataClientService
      .readClientList(this.dataManagementGroupService.currentClientFilter)
      .subscribe((x) => {
        this.result = x.clients;

        if (this.result.length === 1) {
          this.selectedClient = this.result[0];
          const tmpClientName = this.visualName(this.result[0]);
          if (!tmpClientName.includes(this.selectedClientName))
            this.selectedClientName = this.visualName(this.result[0]);
        }
      });
  }

  private visualName(value: IClient): string {
    if (!this.selectedClient) {
      return '';
    }

    return `${value.idNumber} - ${value.company} ${value.firstName} ${value.name}`;
  }

  onPageChange() {
    setTimeout(() => this.dataManagementGroupService.readPage(), 50);
  }

  onDeleteClient(value: IGroupItem) {
    const groupItems = this.dataManagementGroupService.editGroup?.groupItems;
    if (this.dataManagementGroupService.editGroup && groupItems) {
      this.dataManagementGroupService.editGroup.groupItems = groupItems.filter(
        (item) => item.clientId !== value.clientId
      );
      this.onIsChanging(true);
    }
  }

  private applyClient() {
    if (this.selectedClient) {
      const id = this.selectedClient.id;

      const result = this.dataManagementGroupService.editGroup?.groupItems.find(
        (x) => x.clientId === id
      );

      if (!result) {
        this.dataManagementGroupService.add(this.selectedClient);
        this.clearSelection();
        this.onIsChanging(true);
      } else {
        this.toastShowService.showInfo(
          MessageLibrary.CLIENT_DOUBLETS,
          'CLIENT_DOUBLETS'
        );
      }
    }
  }

  readChangeList() {
    this.dataManagementGroupService.readPage();
  }

  /* #region   header */

  onClickHeader(orderBy: string) {
    let sortOrder = '';

    if (orderBy === 'firstName') {
      this.firstNameHeader.DirectionSwitchSimple();

      if (this.firstNameHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.firstNameHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    } else if (orderBy === 'idNumber') {
      this.numberHeader.DirectionSwitchSimple();

      if (this.numberHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.numberHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    } else if (orderBy === 'company') {
      this.companyHeader.DirectionSwitchSimple();

      if (this.companyHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.companyHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    } else if (orderBy === 'name') {
      this.nameHeader.DirectionSwitchSimple();

      if (this.nameHeader.order === HeaderDirection.Down) {
        sortOrder = 'asc';
      } else if (this.nameHeader.order === HeaderDirection.Up) {
        sortOrder = 'desc';
      } else {
        sortOrder = '';
      }
    }

    this.sort(orderBy, sortOrder);
  }

  private sort(orderBy: string, sortOrder: string) {
    this.dataManagementGroupService.orderByGroupItem = orderBy;
    this.dataManagementGroupService.sortOrderGroupItem = sortOrder;
    this.setHeaderArrowToUndefined();
    this.setDirection(sortOrder, this.setPosition(orderBy)!);
    this.setHeaderArrowTemplate();
    this.dataManagementGroupService.sortGroupItems();
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
    this.arrowNo = this.setHeaderArrowTemplateSub(this.numberHeader);
    this.arrowCompany = this.setHeaderArrowTemplateSub(this.companyHeader);
    this.arrowName = this.setHeaderArrowTemplateSub(this.nameHeader);
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
    this.sort(
      this.dataManagementGroupService.orderBy,
      this.dataManagementGroupService.sortOrder
    );
  }

  private setHeaderArrowToUndefined() {
    this.firstNameHeader.order = HeaderDirection.None;
    this.numberHeader.order = HeaderDirection.None;
    this.companyHeader.order = HeaderDirection.None;
    this.nameHeader.order = HeaderDirection.None;
  }

  /* #endregion   header */

  /* #region   CheckBox */

  checkBoxValue(i: number): boolean {
    try {
      const clientId =
        this.dataManagementGroupService.editGroup?.groupItems[i].clientId;
      if (clientId) {
        const tmpCheckBoxValue =
          this.dataManagementGroupService.findCheckBoxValue(clientId);

        if (this.dataManagementGroupService.headerCheckBoxValue === true) {
          if (tmpCheckBoxValue) {
            return tmpCheckBoxValue.checked;
          }
          return true;
        }

        if (tmpCheckBoxValue) {
          return tmpCheckBoxValue.checked;
        }
      }
    } finally {
      this.checkBoxIndeterminate =
        this.dataManagementGroupService.checkBoxIndeterminate();
    }
    return false;
  }

  onChangeCheckBox(i: number, value: any) {
    this.isConditionReaded();
    try {
      const isChecked = value.currentTarget.checked;
      const clientId =
        this.dataManagementGroupService.editGroup?.groupItems[i].clientId;
      if (clientId) {
        const tmpCheckBoxValue =
          this.dataManagementGroupService.findCheckBoxValue(clientId);

        if (tmpCheckBoxValue) {
          tmpCheckBoxValue.checked = isChecked;
        } else {
          const c = new CheckBoxValue();
          c.id = clientId;
          c.checked = isChecked;
          this.dataManagementGroupService.addCheckBoxValueToArray(c);
        }
      }
    } finally {
      this.checkBoxIndeterminate =
        this.dataManagementGroupService.checkBoxIndeterminate();
    }
  }

  onChangeHeaderCheckBox() {
    this.isConditionReaded();
    this.dataManagementGroupService.clearCheckedArray();
  }

  private isConditionReaded() {}
  /* #endregion   CheckBox */

  private setFilter() {
    this.dataManagementGroupService.currentClientFilter.numberOfItemsPerPage = 20;
    this.dataManagementGroupService.currentClientFilter.firstItemOnLastPage = 0;
  }
}
