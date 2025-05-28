import { inject, Injectable, signal } from '@angular/core';
import {
  CheckBoxValue,
  Client,
  Filter,
  IClient,
  IClientAttribute,
  ICountry,
  ITruncatedClient,
} from 'src/app/core/client-class';
import {
  Group,
  GroupFilter,
  GroupItem,
  GroupTree,
  IGroup,
  IGroupTree,
  ITruncatedGroup,
} from 'src/app/core/group-class';
import { DataClientService } from '../data-client.service';
import { ToastShowService } from 'src/app/toast/toast-show.service';
import { DataGroupService } from '../data-group.service';
import { Observable, catchError, map, throwError } from 'rxjs';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/helpers/object-helpers';
import {
  isNgbDateStructValid,
  transformDateToNgbDateStruct,
} from 'src/app/helpers/format-helper';
import { DataCountryStateService } from '../data-country-state.service';
import { StateCountryToken } from 'src/app/core/calendar-rule-class';
import { NavigationService } from 'src/app/services/navigation.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DataManagementGroupService {
  public isReset = signal(false);
  public isRead = signal(false);
  public showProgressSpinner = signal(false);
  public initIsRead = signal(false);
  public restoreSearch = signal('');
  public showTree = signal(true);
  public dataClientService = inject(DataClientService);
  public dataGroupService = inject(DataGroupService);
  public toastShowService = inject(ToastShowService);
  private dataCountryStateService = inject(DataCountryStateService);
  private navigationService = inject(NavigationService);
  private httpClient = inject(HttpClient);

  public currentClientFilter: Filter = new Filter();
  public checkedArray: CheckBoxValue[] = new Array<CheckBoxValue>();
  public clientAttribute: IClientAttribute[] = [];
  public headerCheckBoxValue = false;
  public stateList: StateCountryToken[] | undefined;

  public orderBy = 'name';
  public sortOrder = 'desc';
  public requiredPage = 1;
  public numberOfItemsPerPage = 5;
  public maxItems = 0;
  public maxPages = 0;
  public firstItem = 0;
  public orderByGroupItem = 'name';
  public sortOrderGroupItem = 'desc';

  public listClientWrapper: ITruncatedClient | undefined;
  public listWrapper: ITruncatedGroup | undefined;
  public currentFilter: GroupFilter = new GroupFilter();
  public editGroup: IGroup | undefined;

  public groupTree: GroupTree = new GroupTree();
  public flatNodeList: Group[] = [];
  public selectedNode: Group | undefined;
  public expandedNodes = new Set<string>();

  private currentFilterDummy: GroupFilter | undefined;
  private editGroupDummy: IGroup | undefined;
  private currentClientFilterDummy: Filter | undefined;
  private temporaryClientFilterDummy: Filter | undefined;

  /* #region   init */
  init() {
    this.dataClientService
      .getStateTokenList(true)
      .subscribe((x: StateCountryToken[]) => {
        this.stateList = x.filter((c) => c.state !== c.country);
        this.currentClientFilter.filteredStateToken = this.stateList;
        this.currentClientFilter.list = this.stateList;
      });

    this.dataCountryStateService.getCountryList().subscribe((x: ICountry[]) => {
      if (x) {
        x.forEach((s) => (s.select = true));
        this.currentClientFilter.countries = x;

        this.currentClientFilter.countriesHaveBeenReadIn = x.length > 0;
      }
    });
    this.currentFilter.setEmpty();
    this.readPage();
  }

  /* #endregion   init */

  showExternalClient(id: string) {
    this.showProgressSpinner.set(true);
    this.dataGroupService.getGroup(id).subscribe({
      next: (x: IGroup) => {
        this.prepareGroup(x);
        this.navigationService.navigateToEditGroup();
        this.showProgressSpinner.set(false);
      },
      error: (error) => {
        console.error('Fehler beim Laden der Gruppe:', error);
        this.toastShowService.showError(error, 'GroupLoadError');
        this.showProgressSpinner.set(false);
      },
    });
  }

  readPageClient() {
    this.showProgressSpinner.set(true);

    this.dataClientService
      .readClientList(this.currentClientFilter)
      .subscribe((x) => {
        this.listClientWrapper = x;
        this.maxItems = x.maxItems;
        this.firstItem = x.firstItemOnPage;
        this.maxPages = x.maxPages;
      });
    this.showProgressSpinner.set(false);
    this.fireIsReadEvent();
  }

  clearCheckedArray() {
    this.checkedArray = new Array<CheckBoxValue>();
  }

  addCheckBoxValueToArray(value: CheckBoxValue) {
    this.checkedArray.push(value);
  }

  findCheckBoxValue(key: string): CheckBoxValue | undefined {
    if (!this.checkedArray) {
      return undefined;
    }
    if (key === '') {
      return undefined;
    }

    return this.checkedArray.find((x) => x.id === key);
  }

  removeCheckBoxValueToArray(key: string) {
    const index = this.checkedArray.findIndex((x) => x.id === key);
    this.checkedArray.splice(index, 1);
  }

  checkBoxIndeterminate() {
    if (this.headerCheckBoxValue === undefined) {
      this.headerCheckBoxValue = false;
    }
    if (this.headerCheckBoxValue === null) {
      this.headerCheckBoxValue = false;
    }

    if (this.headerCheckBoxValue === true) {
      const tmp = this.checkedArray.find((x) => x.checked === false);
      if (!(tmp === undefined || tmp === null)) {
        return true;
      }
    }
    if (this.headerCheckBoxValue === false) {
      const tmp = this.checkedArray.find((x) => x.checked === true);
      if (!(tmp === undefined || tmp === null)) {
        return true;
      }
    }

    return false;
  }

  readPage(isSecondRead = false) {
    this.showProgressSpinner.set(true);
    this.dataGroupService.readGroupList(this.currentFilter).subscribe((x) => {
      this.listWrapper = x;
      this.maxItems = x.maxItems;
      this.firstItem = x.firstItemOnPage;
      this.maxPages = x.maxPages;
    });

    if (isSecondRead) {
      this.fireIsReadEvent();
    }
    this.showProgressSpinner.set(false);
  }

  deleteGroup(key: string): Observable<IGroup> {
    return this.dataGroupService.deleteGroup(key).pipe(
      map((response) => {
        this.initTree();
        return response;
      }),
      catchError((error) => {
        this.toastShowService.showError(error, 'GroupDeleteError');
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
    this.showProgressSpinner.set(true);
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

    this.navigationService.navigateToEditGroup();

    setTimeout(() => {
      this.fireIsReadEvent();
    }, 300);

    this.showProgressSpinner.set(false);
  }

  prepareGroup(value: IGroup, withoutUpdateDummy = false) {
    this.setDateStruc(value);
    if (value == null) {
      return;
    }

    this.editGroup = value;

    this.sortGroupItems();

    if (!withoutUpdateDummy) {
      this.editGroupDummy = cloneObject<IGroup>(this.editGroup);
    }

    if (this.editGroup.id) {
      setTimeout(() => history.pushState(null, '', this.createUrl()), 100);
    }

    this.isReset.set(true);
    setTimeout(() => this.isReset.set(false), 100);
  }

  saveEditGroup(withoutUpdateDummy = false) {
    if (this.editGroup) {
      const action = this.editGroup.id
        ? this.dataGroupService.updateGroup(this.editGroup)
        : this.dataGroupService.addGroup(this.editGroup);

      action.subscribe({
        next: (x) => {
          this.prepareGroup(x, withoutUpdateDummy);
        },
        error: (error) => {
          if (this.editGroup?.id) {
            this.readGroup(this.editGroup.id);
          } else {
            this.createGroup();
          }

          this.toastShowService.showError(error, 'GroupError');
        },
        complete: () => {},
      });
    }
  }

  createUrl(): string {
    return 'workplace/edit-group?id=' + this.editGroup!.id;
  }

  readGroup(id: string) {
    if (id) {
      this.dataGroupService.getGroup(id).subscribe((x) => {
        this.prepareGroup(x);
      });
    }
  }

  resetData() {
    this.prepareGroup(this.editGroupDummy!);
  }

  private setDateStruc(value: IGroup) {
    if (value) {
      value.internalValidFrom = transformDateToNgbDateStruct(value.validFrom);
      if (value.validUntil) {
        value.internalValidUntil = transformDateToNgbDateStruct(
          value.validUntil
        );
      }
    }
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
    if (
      this.editGroup?.name &&
      this.editGroup?.validFrom &&
      this.editGroup?.internalValidFrom &&
      isNgbDateStructValid(this.editGroup?.internalValidFrom)
    ) {
      return true;
    }
    return false;
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

  /* #region   Tree Group */

  showGroupTree() {
    this.navigationService.navigateToGroupTree();
  }

  initTree(rootId?: string) {
    this.flatNodeList = this.flattenTree(this.groupTree.nodes);
    setTimeout(() => this.showProgressSpinner.set(true), 0);

    this.dataGroupService.getGroupTree(rootId).subscribe({
      next: (tree: IGroupTree) => {
        this.groupTree = new GroupTree();
        this.groupTree.rootId = tree.rootId;
        this.groupTree.nodes = tree.nodes.map((node) => new Group(node));
        this.flatNodeList = this.flattenTree(this.groupTree.nodes);

        const expandedSet = new Set<string>();
        this.groupTree.nodes.forEach((node) => {
          if (node.id) {
            expandedSet.add(node.id);
          }
        });
        this.expandedNodes = expandedSet;

        this.fireIsReadEvent();
      },
      error: (error) => {
        this.toastShowService.showError(error, 'GroupTreeError');
      },
      complete: () => {
        setTimeout(() => this.showProgressSpinner.set(false), 0);
      },
    });
  }

  getPathToNode(id: string): Observable<IGroup[]> {
    return this.httpClient
      .get<IGroup[]>(`${environment.baseUrl}GroupTrees/path/${id}`)
      .pipe(
        catchError((error) => {
          this.toastShowService.showError(error, 'GroupPathError');
          return throwError(() => error);
        })
      );
  }

  moveGroup(id: string, newParentId: string) {
    this.showProgressSpinner.set(true);

    const params = new HttpParams().set('newParentId', newParentId);

    return this.httpClient
      .post<IGroup>(`${environment.baseUrl}GroupTrees/move/${id}`, null, {
        params,
      })
      .pipe(
        catchError((error) => {
          this.toastShowService.showError(error, 'GroupMoveError');
          return throwError(() => error);
        })
      )
      .subscribe({
        next: () => {
          this.init();
          this.initTree();
          this.showProgressSpinner.set(false);
        },
        error: () => {
          this.showProgressSpinner.set(false);
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
    this.dataGroupService.getRefreshTree().subscribe({
      next: () => {
        this.initTree();
      },
      error: (error) => {
        this.toastShowService.showError(error, 'RefreshGroupTreeError');
      },
    });
  }

  /**
   * Wandelt eine hierarchische Baumstruktur in eine flache Liste um
   * @param nodes Die Knoten, die abgeflacht werden sollen
   * @returns Eine flache Liste aller Knoten
   */
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
}
