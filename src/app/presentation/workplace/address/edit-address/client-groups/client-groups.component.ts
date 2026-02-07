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
import { Subject } from 'rxjs';
import { NgbModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { Group } from 'src/app/domain/models/group/group-class';
import { IClientGroupItem } from 'src/app/domain/models/client/client-group-item-class';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { GroupSelectComponent } from 'src/app/presentation/shared/group-select/group-select.component';
import { ButtonNewComponent } from 'src/app/presentation/shared/button-new/button-new.component';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { transformNgbDateStructToDate, transformDateToNgbDateStruct } from 'src/app/shared/helpers/ngb-date.helper';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';

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
    ButtonNewComponent,
    ExpandableCardComponent,
    FontAwesomeModule,
    NgbTooltipModule,
  ],
  providers: [TableSortingService],
})
export class ClientGroupsComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() clientId?: string;
  @Input() isReadOnly = false;
  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('groupsForm', { static: false }) groupsForm: NgForm | undefined;

  public dataManagementClientService = inject(DataManagementClientService);
  public translate = inject(TranslateService);
  public authorizationService = inject(AuthorizationService);
  public sortingService = inject(TableSortingService);

  private injector = inject(Injector);

  public faCalendar = faCalendar;
  public highlightRowId: string | undefined = undefined;
  public objectForUnsubscribe: any;

  public groupValidationState: Map<number, boolean | undefined> = new Map();
  public groupFromDateValidationState: Map<number, boolean | undefined> =
    new Map();

  public groupValidFromValues = new Map<IClientGroupItem, NgbDateStruct | undefined>();
  public groupValidUntilValues = new Map<IClientGroupItem, NgbDateStruct | undefined>();
  public minDateValue: NgbDateStruct = { year: 1900, month: 1, day: 1 };

  private ngUnsubscribe = new Subject<void>();

  ngOnInit(): void {
    this.sortingService.initialize({
      columns: ['name', 'validFrom', 'validUntil'],
      defaultOrderBy: 'name',
      defaultSortOrder: 'asc',
      useThreeWaySort: true
    });

    this.readSignals();
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
      this.isReadOnly ||
      this.dataManagementClientService.editClientDeleted() ||
      !this.authorizationService.isAdmin
    );
  }

  getMinDate(): NgbDateStruct {
    return this.minDateValue;
  }

  getGroupValidFrom(groupItem: IClientGroupItem): NgbDateStruct | undefined {
    return this.groupValidFromValues.get(groupItem);
  }

  setGroupValidFrom(groupItem: IClientGroupItem, value: NgbDateStruct | undefined): void {
    this.groupValidFromValues.set(groupItem, value);
    groupItem.validFrom = value ? transformNgbDateStructToDate(value) : undefined;
    this.calcValidation();
  }

  getGroupValidUntil(groupItem: IClientGroupItem): NgbDateStruct | undefined {
    return this.groupValidUntilValues.get(groupItem);
  }

  setGroupValidUntil(groupItem: IClientGroupItem, value: NgbDateStruct | undefined): void {
    this.groupValidUntilValues.set(groupItem, value);
    groupItem.validUntil = value ? transformNgbDateStructToDate(value) : undefined;
    this.calcValidation();
  }

  sortClientGroups(): void {
    const currentClient = this.dataManagementClientService.editClient();
    if (!currentClient?.groupItems) return;

    const orderBy = this.sortingService.getCurrentOrderBy();
    const sortOrder = this.sortingService.getCurrentSortOrder();

    currentClient.groupItems.sort((a, b) => {
      let compareValue = 0;

      if (orderBy === 'name') {
        compareValue = (a.groupName || '').localeCompare(b.groupName || '');
      } else if (orderBy === 'validFrom') {
        const aDate = a.validFrom ? new Date(a.validFrom).getTime() : 0;
        const bDate = b.validFrom ? new Date(b.validFrom).getTime() : 0;
        compareValue = aDate - bDate;
      } else if (orderBy === 'validUntil') {
        const aDate = a.validUntil ? new Date(a.validUntil).getTime() : 0;
        const bDate = b.validUntil ? new Date(b.validUntil).getTime() : 0;
        compareValue = aDate - bDate;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  }

  onClickHeader(orderBy: string): void {
    this.sortingService.onHeaderClick(orderBy, () => this.sortClientGroups());
  }

  trackByIndex(index: number): number {
    return index;
  }

  onGroupChanged(index: number, selectedGroup: Group | null): void {
    if (!selectedGroup) return;

    const currentClient = this.dataManagementClientService.editClient();
    if (!currentClient?.groupItems?.[index]) return;

    currentClient.groupItems[index].groupId = selectedGroup.id;
    currentClient.groupItems[index].groupName = selectedGroup.name;

    this.dataManagementClientService.clientEditService.editClient.update((c) => ({ ...c! }));
    this.isChangingEvent.emit(true);
  }

  removeGroup(index: number): void {
    const currentClient = this.dataManagementClientService.editClient();
    if (!currentClient?.groupItems) return;

    currentClient.groupItems.splice(index, 1);

    this.dataManagementClientService.clientEditService.editClient.update((c) => ({ ...c! }));
    this.isChangingEvent.emit(true);
  }

  addGroup(): void {
    this.dataManagementClientService.addGroup();
    this.isChangingEvent.emit(true);
  }

  public calcValidation(): void {
    const currentClient = this.dataManagementClientService.editClient();
    if (!currentClient || !currentClient.groupItems) {
      return;
    }

    this.groupValidationState.clear();
    this.groupFromDateValidationState.clear();

    currentClient.groupItems.forEach((groupItem, index) => {
      const validFrom = groupItem.validFrom ? new Date(groupItem.validFrom) : null;

      if (!validFrom) {
        this.groupFromDateValidationState.set(index, false);
      } else {
        this.groupFromDateValidationState.set(index, true);
      }

      if (!groupItem.validUntil) {
        this.groupValidationState.set(index, undefined);
      } else {
        const validUntil = new Date(groupItem.validUntil);

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
        if (client?.groupItems) {
          this.groupValidFromValues.clear();
          this.groupValidUntilValues.clear();

          client.groupItems.forEach((groupItem) => {
            this.groupValidFromValues.set(
              groupItem,
              groupItem.validFrom ? transformDateToNgbDateStruct(groupItem.validFrom) : undefined
            );
            this.groupValidUntilValues.set(
              groupItem,
              groupItem.validUntil ? transformDateToNgbDateStruct(groupItem.validUntil) : undefined
            );
          });

          const validFrom = client.membership?.validFrom;
          this.minDateValue = validFrom
            ? transformDateToNgbDateStruct(validFrom)!
            : { year: 1900, month: 1, day: 1 };

          this.calcValidation();
        }
      });
    });
  }
}
