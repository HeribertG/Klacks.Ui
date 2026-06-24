// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  inject,
  LOCALE_ID,
  OnInit,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CheckBoxValue, IClient } from 'src/app/domain/models/client/client-class';
import { IGroupItem } from 'src/app/domain/models/group/group-class';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { isNumeric } from 'src/app/shared/helpers/number.helper';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';

@Component({
  selector: 'app-edit-group-members',
  templateUrl: './edit-group-members.component.html',
  styleUrls: ['./edit-group-members.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    TrashIconRedComponent,
    ExpandableCardComponent
],
  providers: [TableSortingService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditGroupMembersComponent implements OnInit, AfterViewInit {
  public authorizationService = inject(AuthorizationService);
  public dataManagementGroupService = inject(DataManagementGroupService);
  public toastShowService = inject(ToastShowService);
  public groupSelectionService = inject(GroupSelectionService);
  public sortingService = inject(TableSortingService);
  private locale: string = inject(LOCALE_ID);
  private dataClientService = inject(DataClientService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  @Output() isChangingEvent = new EventEmitter();
  @Output() isEnterEvent = new EventEmitter();

  result = new Array<IClient>();
  selectedClientName = '';
  selectedClient: IClient | undefined = undefined;

  page = 1;
  checkBoxIndeterminate = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  @HostListener('search', ['$event']) onsearch(event: any) {
    if (!this.selectedClientName) {
      this.clearSelection();
      return;
    }
  }

  ngOnInit(): void {
    this.locale = DomainMessages.DEFAULT_LANG;

    this.sortingService.initialize({
      columns: ['idNumber', 'company', 'firstName', 'name'],
      defaultOrderBy: 'idNumber',
      defaultSortOrder: 'asc',
      useThreeWaySort: true
    });

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
      this.cdr.markForCheck();
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

  private refreshList(term: string) {
    this.dataManagementGroupService.currentClientFilter.searchString = term;

    this.dataClientService
      .readClientList(this.dataManagementGroupService.currentClientFilter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((x) => {
        this.result = x.clients;

        if (this.result.length === 1) {
          this.selectedClient = this.result[0];
          const tmpClientName = this.visualName(this.result[0]);
          if (!tmpClientName.includes(this.selectedClientName))
            this.selectedClientName = this.visualName(this.result[0]);
        }
        this.cdr.markForCheck();
      });
  }

  private visualName(value: IClient): string {
    if (!this.selectedClient) {
      return '';
    }

    return `${value.idNumber} - ${value.company} ${value.firstName} ${value.name}`;
  }

  onPageChange() {
    setTimeout(() => {
      this.dataManagementGroupService.readPage();
      this.cdr.markForCheck();
    }, 50);
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
          DomainMessages.CLIENT_DOUBLETS,
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
    this.sortingService.onHeaderClick(orderBy, () => {
      this.dataManagementGroupService.orderByGroupItem = this.sortingService.getCurrentOrderBy();
      this.dataManagementGroupService.sortOrderGroupItem = this.sortingService.getCurrentSortOrder();
      this.dataManagementGroupService.sortGroupItems();
    });
  }

  private reReadSortData() {
    this.sortingService.onHeaderClick(
      this.dataManagementGroupService.orderBy,
      () => {
        this.dataManagementGroupService.orderByGroupItem = this.sortingService.getCurrentOrderBy();
        this.dataManagementGroupService.sortOrderGroupItem = this.sortingService.getCurrentSortOrder();
        this.dataManagementGroupService.sortGroupItems();
      }
    );
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
