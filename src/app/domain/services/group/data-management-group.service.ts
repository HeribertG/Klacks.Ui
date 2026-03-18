// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import {
  CheckBoxValue,
  Client,
  Filter,
  IClient,
  IClientAttribute,
  ICountry,
  ITruncatedClient,
} from 'src/app/domain/models/client/client-class';
import {
  Group,
  GroupFilter,
  GroupItem,
  GroupTree,
  IGroup,
  IGroupTree,
  ITruncatedGroup,
} from 'src/app/domain/models/group/group-class';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { Observable, catchError, map, throwError, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/shared/helpers/object.helper';
import { DataCountryStateService } from 'src/app/infrastructure/api/settings/data-country-state.service';
import { DataGroupVisibilityService } from 'src/app/infrastructure/api/group/data-group-visibility.service';
import { DataManagementCalendarSelectionService } from '../calendar/data-management-calendar-selection.service';
import { ICalendarSelection } from '../../models/calendar/calendar-selection-class';
import { StateCountryToken } from 'src/app/domain/models/calendar/calendar-rule-class';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { ILoadable, IResettable, ISaveable, INavigable } from 'src/app/domain/interfaces/manageable.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { IPaginationDataService } from 'src/app/domain/interfaces/pagination.interface';
import { CheckboxStateService } from 'src/app/domain/services/shared/checkbox-state.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementGroupService implements ISaveable, IResettable, ILoadable, INavigable {
  public dataClientService = inject(DataClientService);
  public dataGroupService = inject(DataGroupService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private dataCountryStateService = inject(DataCountryStateService);
  private dataGroupVisibilityService = inject(DataGroupVisibilityService);
  private dataManagementCalendarSelectionService = inject(DataManagementCalendarSelectionService);
  private registry = inject(MANAGEABLE_SERVICE_REGISTRY_TOKEN);
  private destroy$ = new Subject<void>();
  private checkboxState = new CheckboxStateService();

  constructor() {
    this.registry.register(
      RouteName.GROUP,
      DataManagementGroupService
    );
    this.registry.register(
      RouteName.EDIT_GROUP,
      DataManagementGroupService
    );
  }

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }
  public onSaveCompleted?: () => void;
  public onExternalFilterChange?: () => void;

  public isReset = signal(false);
  public isRead = signal(false);
  public initIsRead = signal(false);
  public restoreSearch = signal('');
  public showTree = signal(true);

  public currentClientFilter: Filter = new Filter();
  public get checkedArray(): CheckBoxValue[] { return this.checkboxState.checkedArray; }
  public set checkedArray(value: CheckBoxValue[]) { this.checkboxState.checkedArray = value; }
  public clientAttribute: IClientAttribute[] = [];
  public get headerCheckBoxValue(): boolean { return this.checkboxState.headerCheckBoxValue; }
  public set headerCheckBoxValue(value: boolean) { this.checkboxState.headerCheckBoxValue = value; }
  public stateList: StateCountryToken[] | undefined;

  public orderBy = 'name';
  public sortOrder = 'desc';
  public requiredPage = 1;
  public numberOfItemsPerPage = 5;
  public paginationDataService!: IPaginationDataService;
  public orderByGroupItem = 'name';
  public sortOrderGroupItem = 'desc';

  public listClientWrapper: ITruncatedClient | undefined;
  public listWrapper: ITruncatedGroup | undefined;
  public currentFilter: GroupFilter = new GroupFilter();
  public editGroup: IGroup | undefined;

  public availableCalendars: ICalendarSelection[] = [];

  public groupTree: GroupTree = new GroupTree();
  public flatNodeList: Group[] = [];
  public selectedNode: Group | undefined;
  public expandedNodes = new Set<string>();

  public hasGroups(): boolean {
    return (this.flatNodeList?.length ?? 0) > 0;
  }

  public hasRootGroups = signal(false);

  private currentFilterDummy: GroupFilter | undefined;
  private editGroupDummy: IGroup | undefined;
  private temporaryGroupFilterDummy: GroupFilter | undefined;
  private currentClientFilterDummy: Filter | undefined;
  private temporaryClientFilterDummy: Filter | undefined;

  /* #region   init */

  init() {
    this.dataClientService
      .getStateTokenList(true)
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: StateCountryToken[]) => {
        this.stateList = x.filter((c) => c.state !== c.country);
        this.currentClientFilter.filteredStateToken = this.stateList;
        this.currentClientFilter.list = this.stateList;
      });

    this.dataCountryStateService.getCountryList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ICountry[]) => {
        if (x) {
          x.forEach((s) => (s.select = true));
          this.currentClientFilter.countries = x;

          this.currentClientFilter.countriesHaveBeenReadIn = x.length > 0;
        }
      });

    this.dataGroupVisibilityService.getRoots()
      .pipe(takeUntil(this.destroy$))
      .subscribe((rootGroups: IGroup[]) => {
        this.hasRootGroups.set(rootGroups.length > 0);
      });

    this.loadCalendarSelections();
    this.readPage();
  }

  initTree(rootId?: string, preserveExpandedState = false) {
    this.flatNodeList = this.flattenTree(this.groupTree.nodes);
    setTimeout(() => this._showProgressSpinner.set(true), 0);

    const previousExpandedNodes = preserveExpandedState ? new Set(this.expandedNodes) : new Set<string>();

    this.dataGroupService.getGroupTree(rootId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tree: IGroupTree) => {
          this.groupTree = new GroupTree();
          this.groupTree.rootId = tree.rootId;
          this.groupTree.nodes = tree.nodes.map((node) => new Group(node));
          this.flatNodeList = this.flattenTree(this.groupTree.nodes);

          if (preserveExpandedState) {
            this.expandedNodes = previousExpandedNodes;
          } else {
            this.expandedNodes = new Set<string>();
          }

          this.fireIsReadEvent();
        },
        error: (error) => {
          this.eventBus.emit(DomainEventType.ERROR, {
            message: error,
            code: 'GroupTreeError',
            context: 'DataManagementGroupService.initTree'
          });
        },
        complete: () => {
          setTimeout(() => this._showProgressSpinner.set(false), 0);
        },
      });
  }

  private async loadCalendarSelections(): Promise<void> {
    try {
      if (!this.dataManagementCalendarSelectionService.isRead()) {
        await this.dataManagementCalendarSelectionService.readData();
      }
      this.availableCalendars =
        this.dataManagementCalendarSelectionService.calendarsSelections.filter(
          (cal) => !cal.internal
        );
    } catch {
      this.availableCalendars = [];
    }
  }

  /* #endregion   init */

  showExternalClient(id: string) {
    this._showProgressSpinner.set(true);
    this.dataGroupService.getGroup(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (x: IGroup) => {
          this.prepareGroup(x);
          this._showProgressSpinner.set(false);
        },
        error: (error) => {
          console.error('Error while loading groups:', error);
          this.eventBus.emit(DomainEventType.ERROR, {
            message: error,
            code: 'GroupLoadError',
            context: 'DataManagementGroupService.showExternalClient'
          });
          this._showProgressSpinner.set(false);
        },
      });
  }

  readPageClient() {
    this._showProgressSpinner.set(true);

    this.dataClientService
      .readClientList(this.currentClientFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe((x) => {
        this.listClientWrapper = x;
      });
    this._showProgressSpinner.set(false);
    this.fireIsReadEvent();
  }

  clearCheckedArray() {
    this.checkboxState.clearCheckedArray();
  }

  addCheckBoxValueToArray(value: CheckBoxValue) {
    this.checkboxState.addCheckBoxValueToArray(value);
  }

  findCheckBoxValue(key: string): CheckBoxValue | undefined {
    return this.checkboxState.findCheckBoxValue(key);
  }

  removeCheckBoxValueToArray(key: string) {
    this.checkboxState.removeCheckBoxValueToArray(key);
  }

  checkBoxIndeterminate() {
    return this.checkboxState.checkBoxIndeterminate();
  }

  readPage(isSecondRead = false) {
    this._showProgressSpinner.set(true);
    this.dataGroupService.readGroupList(this.currentFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe((x) => {
        this.listWrapper = x;
        this.paginationDataService = {
          maxItems: x.maxItems,
          firstItem: x.firstItemOnPage,
          maxPages: x.maxPages,
        };
      });

    if (isSecondRead) {
      this.fireIsReadEvent();
    }
    this._showProgressSpinner.set(false);
  }

  deleteGroup(key: string): Observable<IGroup> {
    return this.dataGroupService.deleteGroup(key).pipe(
      map((response) => {
        this.initTree();
        return response;
      }),
      catchError((error) => {
        this.eventBus.emit(DomainEventType.ERROR, {
          message: error,
          code: 'GroupDeleteError',
          context: 'DataManagementGroupService.deleteGroup'
        });
        return throwError(() => error);
      })
    );
  }

  fireIsReadEvent() {
    this.isRead.set(true);
    setTimeout(() => this.isRead.set(false), 100);
  }

  /* #region   edit Group */

  createGroup(parentId?: string) {
    this._showProgressSpinner.set(true);
    const c = new Group({
      name: '',
      description: '',
      validFrom: new Date(),
      parent: parentId,
      depth: 0,
      clientsCount: 0,
      groupItems: [],
    });

    this.prepareGroup(c);

    if (this.flatNodeList.length === 0) {
      this.loadFlatNodeListForParentSelection();
    } else {
      setTimeout(() => {
        this.fireIsReadEvent();
      }, 300);
    }

    this._showProgressSpinner.set(false);
  }

  private loadFlatNodeListForParentSelection() {
    this.dataGroupService.getGroupTree()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tree: IGroupTree) => {
          this.groupTree = new GroupTree();
          this.groupTree.rootId = tree.rootId;
          this.groupTree.nodes = tree.nodes.map((node) => new Group(node));
          this.flatNodeList = this.flattenTree(this.groupTree.nodes);
          this.fireIsReadEvent();
        },
        error: (error) => {
          this.eventBus.emit(DomainEventType.ERROR, {
            message: error,
            code: 'GroupTreeError',
            context: 'DataManagementGroupService.loadFlatNodeListForParentSelection'
          });
        },
      });
  }

  prepareGroup(value: IGroup) {
    if (value == null) {
      return;
    }

    this.editGroup = value;

    this.sortGroupItems();

    this.editGroupDummy = cloneObject<IGroup>(this.editGroup);

    if (this.editGroup.id) {
      setTimeout(() => history.pushState(null, '', this.createUrl()), 100);
    }

    setTimeout(() => {
      this.isReset.set(true);
      this._showProgressSpinner.set(false);
      setTimeout(() => this.isReset.set(false), 100);
    }, 200);
  }

  saveEditGroup() {
    if (this.editGroup) {
      const action = this.editGroup.id
        ? this.dataGroupService.updateGroup(this.editGroup)
        : this.dataGroupService.addGroup(this.editGroup);

      action
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (x) => {
            this.readGroup(x.id!);
            if (this.onSaveCompleted) {
              this.onSaveCompleted();
            }
          },
          error: (error) => {
            if (this.editGroup?.id) {
              this.readGroup(this.editGroup.id);
            } else {
              this.createGroup();
            }

            this.eventBus.emit(DomainEventType.ERROR, {
              message: error,
              code: 'GroupError',
              context: 'DataManagementGroupService.saveEditGroup'
            });
            if (this.onSaveCompleted) {
              this.onSaveCompleted();
            }
          },
          complete: () => {},
        });
    }
  }

  createUrl(): string {
    return '/workplace/edit-group/' + this.editGroup!.id;
  }

  readGroup(id: string) {
    if (id) {
      this.dataGroupService.getGroup(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe((x) => {
          this.prepareGroup(x);
        });
    }
  }

  resetData() {
    this.prepareGroup(this.editGroupDummy!);
  }

  areObjectsDirty(): boolean {
    if (this.isEditGroup_Dirty()) {
      return true;
    }
    return false;
  }

  save() {
    if (this.isEditGroup_Dirty()) {
      this.saveEditGroup();
    }
  }

  add(value: IClient) {
    if (this.editGroup) {
      const item = new GroupItem();
      item.client = value as Client;
      item.clientId = value.id;
      item.groupId = this.editGroup.id;
      this.editGroup.groupItems.push(item);

      this.sortGroupItems();
    }
  }

  sortGroupItems() {
    if (this.editGroup && this.editGroup.groupItems) {
      this.editGroup.groupItems.sort((a, b) => {
        let result = 0;

        if (this.orderByGroupItem == 'idNumber') {
          result = (a.client?.idNumber || 0) - (b.client?.idNumber || 0);
        } else if (this.orderByGroupItem == 'company') {
          result = (a.client?.company || '').localeCompare(
            b.client?.company || ''
          );
        } else if (this.orderByGroupItem == 'name') {
          result = (a.client?.name || '').localeCompare(b.client?.name || '');
        } else if (this.orderByGroupItem == 'firstName') {
          result = (a.client?.firstName || '').localeCompare(
            b.client?.firstName || ''
          );
        }

        if (this.sortOrderGroupItem === 'desc') {
          return -result;
        }

        return result;
      });
    }
  }

  private isEditGroup_Dirty(): boolean {
    const a = this.editGroup as IGroup;
    const b = this.editGroupDummy as IGroup;

    if (!compareComplexObjects(a, b)) {
      return this.isValid();
    }
    return false;
  }

  private isValid(): boolean {
    if (!this.editGroup?.name || !this.editGroup?.validFrom) {
      return false;
    }

    const validFrom = new Date(this.editGroup.validFrom);
    if (isNaN(validFrom.getTime())) {
      return false;
    }

    if (this.editGroup.validUntil) {
      const validUntil = new Date(this.editGroup.validUntil);
      if (isNaN(validUntil.getTime()) || validFrom >= validUntil) {
        return false;
      }
    }

    return true;
  }

  /* #endregion   edit Group */

  /* #region   temporary check is Filter dirty */

  public setTemporaryFilter() {
    this.temporaryClientFilterDummy = cloneObject<Filter>(
      this.currentClientFilter
    );
  }

  public isTemoraryFilter_Dirty(): boolean {
    const a = this.currentClientFilter as Filter;
    const b = this.temporaryClientFilterDummy as Filter;

    if (!compareComplexObjects(a, b)) {
      return true;
    }
    return false;
  }

  /* #endregion   temporary check is Filter dirty */

  /* #region   temporary check is GroupFilter dirty */

  public setTemporaryGroupFilter() {
    this.temporaryGroupFilterDummy = cloneObject<GroupFilter>(
      this.currentFilter
    );
  }

  public isTemporaryGroupFilter_Dirty(): boolean {
    const a = this.currentFilter as GroupFilter;
    const b = this.temporaryGroupFilterDummy as GroupFilter;

    if (!compareComplexObjects(a, b)) {
      return true;
    }
    return false;
  }

  /* #endregion   temporary check is GroupFilter dirty */

  /* #region   Tree Group */

  getPathToNode(id: string): Observable<IGroup[]> {
    return this.dataGroupService.getPathToNode(id).pipe(
      catchError((error) => {
        this.eventBus.emit(DomainEventType.ERROR, {
          message: error,
          code: 'GroupPathError',
          context: 'DataManagementGroupService.getPathToNode'
        });
        return throwError(() => error);
      })
    );
  }

  moveGroup(id: string, newParentId: string) {
    this._showProgressSpinner.set(true);

    return this.dataGroupService.moveGroup(id, newParentId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.eventBus.emit(DomainEventType.ERROR, {
            message: error,
            code: 'GroupMoveError',
            context: 'DataManagementGroupService.moveGroup'
          });
          return throwError(() => error);
        })
      )
      .subscribe({
        next: () => {
          this.init();
          this.initTree(undefined, true);
          this._showProgressSpinner.set(false);
        },
        error: () => {
          this._showProgressSpinner.set(false);
        },
      });
  }

  selectNode(node: Group) {
    this.selectedNode = node;
  }

  toggleNodeExpansion(node: Group) {
    if (this.expandedNodes.has(node.id!)) {
      this.expandedNodes.delete(node.id!);
    } else {
      this.expandedNodes.add(node.id!);
    }
  }

  refreshTree() {
    this.dataGroupService.getRefreshTree()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.initTree();
        },
        error: (error) => {
          this.eventBus.emit(DomainEventType.ERROR, {
            message: error,
            code: 'RefreshGroupTreeError',
            context: 'DataManagementGroupService.refreshTree'
          });
        },
      });
  }

  private flattenTree(nodes: IGroup[]): Group[] {
    const result: Group[] = [];

    const flatten = (nodeList: IGroup[]) => {
      if (!nodeList || !Array.isArray(nodeList)) return;

      nodeList.forEach((node) => {
        const groupNode = node instanceof Group ? node : new Group(node);
        result.push(groupNode);

        if (
          node.children &&
          Array.isArray(node.children) &&
          node.children.length > 0
        ) {
          flatten(node.children);
        }
      });
    };

    flatten(nodes);
    return result;
  }

  expandNode(node: Group): void {
    if (node.id) {
      this.expandedNodes.add(node.id);
    }
  }

  collapseAllNodes(): void {
    this.expandedNodes.clear();
  }
  /* #endregion   Tree Group */

  goBack(): string {
    return '/workplace/group';
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
