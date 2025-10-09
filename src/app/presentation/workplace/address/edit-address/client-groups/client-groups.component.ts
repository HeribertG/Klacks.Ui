/* eslint-disable @typescript-eslint/consistent-generic-constructors */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  AfterViewInit,
  Injector,
  effect,
  runInInjectionContext,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Group } from 'src/app/domain/models/group-class';
import { IClientGroupItem } from 'src/app/domain/models/client-group-item-class';
import { DataGroupItemService } from 'src/app/infrastructure/api/data-group-item.service';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { GroupSelectComponent } from 'src/app/presentation/shared/group-select/group-select.component';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { ButtonNewComponent } from 'src/app/presentation/shared/button-new/button-new.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ClientGroupItemService } from 'src/app/domain/services/client/client-group-item.service';
import { transformNgbDateStructToDate } from 'src/app/domain/helpers/format-helper';

interface HeaderProperties {
  order: number;
}

enum HeaderDirection {
  None = 0,
  Down = 1,
  Up = 2,
}

@Component({
  selector: 'app-client-groups',
  templateUrl: './client-groups.component.html',
  styleUrls: ['./client-groups.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    TranslateModule,
    TrashIconRedComponent,
    GroupSelectComponent,
    IconAngleRightComponent,
    IconAngleDownComponent,
    ButtonNewComponent,
    FontAwesomeModule,
    NgbTooltipModule,
  ],
})
export class ClientGroupsComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() clientId?: string;
  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('groupsForm', { static: false }) groupsForm: NgForm | undefined;

  public dataManagementClientService = inject(DataManagementClientService);
  public translate = inject(TranslateService);
  public authorizationService = inject(AuthorizationService);

  private dataGroupItemService = inject(DataGroupItemService);
  private modalService = inject(ModalService);
  private clientGroupItemService = inject(ClientGroupItemService);
  private injector = inject(Injector);

  public faCalendar = faCalendar;
  public visibleTable = 'inline';
  public clientGroups: IClientGroupItem[] = [];
  public highlightRowId: string | undefined = undefined;
  public objectForUnsubscribe: any;

  public groupValidationState: Map<number, boolean | undefined> = new Map();
  public groupFromDateValidationState: Map<number, boolean | undefined> =
    new Map();

  public arrowName = '';
  public arrowValidFrom = '';
  public arrowValidUntil = '';

  public nameHeader: HeaderProperties = { order: HeaderDirection.None };
  public validFromHeader: HeaderProperties = { order: HeaderDirection.None };
  public validUntilHeader: HeaderProperties = { order: HeaderDirection.None };

  public orderBy = 'name';
  public sortOrder = 'asc';

  public message = MessageLibrary.DELETE_ENTRY;

  private ngUnsubscribe = new Subject<void>();
  private tmplateArrowDown = '↓';
  private tmplateArrowUp = '↑';
  private tmplateArrowUndefined = '↕';

  ngOnInit(): void {
    this.readSignals();
    this.loadClientGroups();

    this.modalService.resultEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'client-groups'
        ) {
          this.deleteGroupItem(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
      });
  }

  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.groupsForm!.valueChanges!.subscribe(() => {
      if (this.groupsForm!.dirty === true) {
        setTimeout(() => this.isChangingEvent.emit(true), 100);
      }
    });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
  }

  isDisabled(): boolean {
    return (
      this.dataManagementClientService.editClientDeleted() ||
      !this.authorizationService.isAuthorised
    );
  }

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  loadClientGroups(): void {
    const currentClient = this.dataManagementClientService.editClient();
    if (!currentClient?.groupItems) {
      this.clientGroups = [];
      return;
    }

    this.clientGroups = [...currentClient.groupItems];
    this.sortClientGroups();
  }

  sortClientGroups(): void {
    const sorted = [...this.clientGroups].sort((a, b) => {
      let compareValue = 0;

      if (this.orderBy === 'name') {
        compareValue = (a.groupName || '').localeCompare(b.groupName || '');
      } else if (this.orderBy === 'validFrom') {
        const aDate = a.validFrom ? new Date(a.validFrom).getTime() : 0;
        const bDate = b.validFrom ? new Date(b.validFrom).getTime() : 0;
        compareValue = aDate - bDate;
      } else if (this.orderBy === 'validUntil') {
        const aDate = a.validUntil ? new Date(a.validUntil).getTime() : 0;
        const bDate = b.validUntil ? new Date(b.validUntil).getTime() : 0;
        compareValue = aDate - bDate;
      }

      return this.sortOrder === 'asc' ? compareValue : -compareValue;
    });

    this.clientGroups = sorted;
  }

  onClickHeader(orderBy: string): void {
    let sortOrder = '';

    if (orderBy === 'name') {
      this.nameHeader.order = this.toggleHeaderDirection(this.nameHeader.order);
      sortOrder = this.getSortOrder(this.nameHeader.order);
    } else if (orderBy === 'validFrom') {
      this.validFromHeader.order = this.toggleHeaderDirection(
        this.validFromHeader.order
      );
      sortOrder = this.getSortOrder(this.validFromHeader.order);
    } else if (orderBy === 'validUntil') {
      this.validUntilHeader.order = this.toggleHeaderDirection(
        this.validUntilHeader.order
      );
      sortOrder = this.getSortOrder(this.validUntilHeader.order);
    }

    this.sort(orderBy, sortOrder);
  }

  private toggleHeaderDirection(current: number): number {
    if (current === HeaderDirection.None) return HeaderDirection.Down;
    if (current === HeaderDirection.Down) return HeaderDirection.Up;
    return HeaderDirection.None;
  }

  private getSortOrder(direction: number): string {
    if (direction === HeaderDirection.Down) return 'asc';
    if (direction === HeaderDirection.Up) return 'desc';
    return '';
  }

  private sort(orderBy: string, sortOrder: string): void {
    this.orderBy = orderBy;
    this.sortOrder = sortOrder;
    this.setHeaderArrowToUndefined();
    this.setDirection(sortOrder, orderBy);
    this.setHeaderArrowTemplate();
    this.sortClientGroups();
  }

  private setDirection(sortOrder: string, orderBy: string): void {
    if (orderBy === 'name') {
      if (sortOrder === 'asc') {
        this.nameHeader.order = HeaderDirection.Down;
      } else if (sortOrder === 'desc') {
        this.nameHeader.order = HeaderDirection.Up;
      }
    } else if (orderBy === 'validFrom') {
      if (sortOrder === 'asc') {
        this.validFromHeader.order = HeaderDirection.Down;
      } else if (sortOrder === 'desc') {
        this.validFromHeader.order = HeaderDirection.Up;
      }
    } else if (orderBy === 'validUntil') {
      if (sortOrder === 'asc') {
        this.validUntilHeader.order = HeaderDirection.Down;
      } else if (sortOrder === 'desc') {
        this.validUntilHeader.order = HeaderDirection.Up;
      }
    }
  }

  private setHeaderArrowToUndefined(): void {
    this.nameHeader.order = HeaderDirection.None;
    this.validFromHeader.order = HeaderDirection.None;
    this.validUntilHeader.order = HeaderDirection.None;
  }

  private setHeaderArrowTemplate(): void {
    this.arrowName = this.setHeaderArrowTemplateSub(this.nameHeader.order);
    this.arrowValidFrom = this.setHeaderArrowTemplateSub(
      this.validFromHeader.order
    );
    this.arrowValidUntil = this.setHeaderArrowTemplateSub(
      this.validUntilHeader.order
    );
  }

  private setHeaderArrowTemplateSub(order: number): string {
    switch (order) {
      case HeaderDirection.Down:
        return this.tmplateArrowDown;
      case HeaderDirection.Up:
        return this.tmplateArrowUp;
      case HeaderDirection.None:
        return '';
      default:
        return '';
    }
  }

  trackByGroupItem(index: number, item: IClientGroupItem): string {
    return `${item.clientId || ''}-${item.groupId || ''}-${index}`;
  }

  onGroupChanged(index: number, selectedGroup: Group | null): void {
    if (!selectedGroup) return;

    const groupItem = this.clientGroups[index];
    if (!groupItem) return;

    groupItem.groupId = selectedGroup.id;
    groupItem.groupName = selectedGroup.name;
  }

  open(groupItem: IClientGroupItem): void {
    if (!groupItem.groupId) return;

    this.modalService.Filing = '';
    this.modalService.componentContext = 'client-groups';

    this.modalService.Filing = groupItem.groupId;
    this.modalService.deleteMessage = this.message;
    this.modalService.setDefault(ModalType.Delete);
    this.modalService.openModel(ModalType.Delete);
  }

  addGroup(): void {
    const currentClient = this.dataManagementClientService.editClient();
    if (!currentClient) return;

    const updatedClient = this.clientGroupItemService.addGroup(currentClient);
    this.dataManagementClientService.editClient.set(updatedClient);
    this.loadClientGroups();
  }

  private deleteGroupItem(groupId: string): void {
    const currentClient = this.dataManagementClientService.editClient();
    if (!currentClient?.id) return;

    this.dataGroupItemService
      .deleteGroupItem(currentClient.id, groupId)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.dataManagementClientService.init();
        this.isChangingEvent.emit(true);
      });
  }

  public calcValidation(): void {
    this.groupValidationState.clear();
    this.groupFromDateValidationState.clear();

    this.clientGroups.forEach((groupItem, index) => {
      const validFrom = transformNgbDateStructToDate(
        groupItem.internalValidFrom
      );

      if (!validFrom) {
        this.groupFromDateValidationState.set(index, false);
      } else {
        this.groupFromDateValidationState.set(index, true);
      }

      if (!groupItem.internalValidUntil) {
        this.groupValidationState.set(index, undefined);
      } else {
        const validUntil = transformNgbDateStructToDate(
          groupItem.internalValidUntil
        );

        if (!validFrom || !validUntil) {
          this.groupValidationState.set(index, false);
        } else {
          this.groupValidationState.set(index, validFrom < validUntil);
        }
      }
    });
  }

  isGroupDateValid(index: number): boolean | undefined {
    return this.groupValidationState.get(index);
  }

  isGroupFromDateValid(index: number): boolean | undefined {
    return this.groupFromDateValidationState.get(index);
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const client = this.dataManagementClientService.editClient();
        if (client) {
          this.loadClientGroups();
          this.calcValidation();
        }
      });
    });
  }
}
