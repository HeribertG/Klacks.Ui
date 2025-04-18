import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import {
  BaseFilter,
  BaseTruncated,
  IBaseFilter,
  IBaseTruncated,
} from './general-class';
import { Client, IClient } from './client-class';

export interface IGroup {
  id?: string;
  name: string;
  description: string;
  validFrom: Date;
  validUntil: Date | undefined;
  internalValidFrom: NgbDateStruct | undefined;
  internalValidUntil: NgbDateStruct | undefined;
  groupItems: IGroupItem[];
  parent?: string;
  root?: string;
  lft: number;
  rgt: number;
  depth: number;
  clientsCount: number;
  children?: IGroup[];
}

export class Group implements IGroup {
  id?: string = undefined;
  name = '';
  description = '';
  validFrom = new Date();
  validUntil: Date | undefined = undefined;
  internalValidFrom: NgbDateStruct | undefined = undefined;
  internalValidUntil: NgbDateStruct | undefined = undefined;
  parent: string | undefined = undefined;
  groupItems: GroupItem[] = [];

  root?: string;
  lft: number = 0;
  rgt: number = 0;
  depth: number = 0;
  clientsCount: number = 0;
  children?: Group[] = [];
}

export interface IGroupItem {
  id: string | undefined;
  groupId: string | undefined;
  clientId: string | undefined;
  client: IClient | undefined;
}

export class GroupItem implements IGroupItem {
  id: string | undefined = undefined;
  groupId: string | undefined = undefined;
  clientId: string | undefined = undefined;
  client: Client | undefined = undefined;
}

export interface ITruncatedGroup extends IBaseTruncated {
  groups: IGroup[];
}

export class TruncatedGroup extends BaseTruncated implements ITruncatedGroup {
  groups = [];
}

export interface IGroupFilter extends IBaseFilter {
  scopeFromFlag: boolean | undefined;
  scopeUntilFlag: boolean | undefined;
  scopeFrom: Date | undefined;
  internalScopeFrom: NgbDateStruct | undefined;
  scopeUntil: Date | undefined;
  internalScopeUntil: NgbDateStruct | undefined;
  showDeleteEntries: boolean | undefined;
  activeDateRange: boolean;
  formerDateRange: boolean;
  futureDateRange: boolean;
}

export class GroupFilter extends BaseFilter implements IGroupFilter {
  scopeFromFlag = undefined;
  scopeUntilFlag = undefined;
  scopeFrom = undefined;
  internalScopeFrom = undefined;
  scopeUntil = undefined;
  internalScopeUntil = undefined;
  showDeleteEntries = false;
  activeDateRange = false;
  formerDateRange = false;
  futureDateRange = false;

  override orderBy = 'name';
  override sortOrder = 'asc';

  setEmpty() {
    this.activeDateRange = true;
    this.formerDateRange = false;
    this.futureDateRange = false;
  }
}

export interface IGroupTree {
  rootId?: string;
  nodes: IGroup[];
}

export interface IGroupCreate {
  name: string;
  description?: string;
  validFrom: Date;
  validUntil?: Date;
  clientIds?: string[];
}

export interface IGroupUpdate {
  name: string;
  description?: string;
  validFrom: Date;
  validUntil?: Date;
  parent?: string; // Verwenden von parent statt parentId
  clientIds?: string[];
}

export class GroupTree implements IGroupTree {
  rootId?: string;
  nodes: Group[] = [];

  // Methode, um einen hierarchischen Baum aus der flachen Liste zu erstellen
  buildHierarchy(): Group[] {
    const nodeMap = new Map<string, Group>();
    const rootNodes: Group[] = [];

    // Erstelle eine Map aller Knoten für schnellen Zugriff
    this.nodes.forEach((node) => {
      nodeMap.set(node.id!, { ...node, children: [] } as Group);
    });

    // Verknüpfe Eltern mit Kindern
    this.nodes.forEach((node) => {
      if (node.parent && nodeMap.has(node.parent)) {
        const parent = nodeMap.get(node.parent);
        if (parent && parent.children) {
          parent.children.push(nodeMap.get(node.id!)!);
        }
      } else {
        // Knoten ohne Eltern sind Wurzelknoten
        if (nodeMap.has(node.id!)) {
          rootNodes.push(nodeMap.get(node.id!)!);
        }
      }
    });

    return rootNodes;
  }
}
