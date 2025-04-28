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
import { ToastService } from 'src/app/toast/toast.service';
import { DataGroupService } from '../data-group.service';
import { Observable } from 'rxjs';
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
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { NavigationService } from 'src/app/services/navigation.service';
import { DataGroupTreeService } from '../data-group-tree.service';

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

  public currentClientFilter: Filter = new Filter();
  public checkedArray: CheckBoxValue[] = new Array<CheckBoxValue>();
  public clientAttribute: IClientAttribute[] = [];
  public headerCheckBoxValue: boolean = false;
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
  public expandedNodes: Set<string> = new Set();

  private currentFilterDummy: GroupFilter | undefined;
  private editGroupDummy: IGroup | undefined;
  private currentClientFilterDummy: Filter | undefined;
  private temporaryClientFilterDummy: Filter | undefined;

  public dataClientService = inject(DataClientService);
  public dataGroupService = inject(DataGroupService);
  private dataGroupTreeService = inject(DataGroupTreeService);
  public toastService = inject(ToastService);
  private dataCountryStateService = inject(DataCountryStateService);
  private navigationService = inject(NavigationService);

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
    this.dataGroupService.getGroup(id).subscribe((x) => {
      const client = x;

      this.prepareGroup(x);

      this.navigationService.navigateToEditGroup();
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

  readPage(isSecondRead: boolean = false) {
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
    return this.dataGroupService.deleteGroup(key);
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
      lft: 0,
      rgt: 0,
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
      console.log(
        'Saving group with lft/rgt:',
        this.editGroup.lft,
        this.editGroup.rgt
      );

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

          this.showError(error, 'GroupError');
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

  showError(Message: string, errorName = '') {
    if (errorName) {
      const y = this.toastService.toasts.find((x) => x.name === errorName);
      this.toastService.remove(y);
    }

    this.toastService.show(Message, {
      classname: 'bg-danger text-light',
      delay: 3000,
      name: errorName,
      autohide: true,
      headertext: MessageLibrary.ERROR_TOASTTITLE,
    });
  }

  /* #region   Tree Group */

  showGroupTree() {
    this.navigationService.navigateToGroupTree();
  }

  /**
   * Initialisiert den Gruppenbaum
   */
  initTree(rootId?: string) {
    console.log('Initializing tree...');

    this.flatNodeList = this.flattenTree(this.groupTree.nodes);
    this.showProgressSpinner.set(true);
    this.dataGroupTreeService.getGroupTree(rootId).subscribe({
      next: (tree: IGroupTree) => {
        console.log('Received tree data:', tree);

        this.groupTree = new GroupTree();
        this.groupTree.rootId = tree.rootId;

        // Konvertiere die Daten zu Group-Objekten
        this.groupTree.nodes = tree.nodes.map((node) => new Group(node));

        // Flache Liste für andere Funktionen erstellen
        this.flatNodeList = this.flattenTree(this.groupTree.nodes);

        // Expandiere die Root-Knoten standardmäßig
        const expandedSet = new Set<string>();
        this.groupTree.nodes.forEach((node) => {
          if (node.id) {
            expandedSet.add(node.id);
          }
        });
        this.expandedNodes = expandedSet;

        this.fireIsReadEvent();
      },
      error: (error: any) => {
        console.error('Error loading tree:', error);
        this.showError(error, 'GroupTreeError');
      },
      complete: () => {
        console.log('Tree loading complete');
        this.showProgressSpinner.set(false);
      },
    });
  }

  moveGroup(id: string, newParentId: string) {
    this.showProgressSpinner.set(true);
    return this.dataGroupTreeService.moveGroup(id, newParentId).subscribe({
      next: () => {
        this.init(); // Baum neu laden
        this.showProgressSpinner.set(false);
      },
      error: (error: any) => {
        this.showError(error, 'GroupMoveError');
        this.showProgressSpinner.set(false);
      },
    });
  }

  /**
   * Markiert einen Knoten als ausgewählt
   */
  selectNode(node: Group) {
    this.selectedNode = node;
  }

  /**
   * Schaltet einen Knoten zwischen expandiert und kollabiert um
   */
  toggleNodeExpansion(node: Group) {
    if (this.expandedNodes.has(node.id!)) {
      this.expandedNodes.delete(node.id!);
    } else {
      this.expandedNodes.add(node.id!);
    }
  }

  /**
   * Wandelt eine hierarchische Baumstruktur in eine flache Liste um
   * @param nodes Die Knoten, die abgeflacht werden sollen
   * @returns Eine flache Liste aller Knoten
   */
  private flattenTree(nodes: IGroup[]): Group[] {
    const result: Group[] = [];

    // Rekursive Funktion zum Sammeln aller Knoten
    const flatten = (nodeList: IGroup[]) => {
      if (!nodeList || !Array.isArray(nodeList)) return;

      nodeList.forEach((node) => {
        // Konvertiere zu Group-Objekt falls nötig
        const groupNode = node instanceof Group ? node : new Group(node);
        result.push(groupNode);

        // Rekursiv für Kinder
        if (
          node.children &&
          Array.isArray(node.children) &&
          node.children.length > 0
        ) {
          flatten(node.children);
        }
      });
    };

    // Starte mit Root-Knoten
    flatten(nodes);
    return result;
  }

  /* #endregion   Tree Group */
}
