// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EffectRef,
  EventEmitter,
  Injector,
  OnDestroy,
  OnInit,
  Output,
  effect,
  inject,
  runInInjectionContext,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Group, IGroup } from 'src/app/domain/models/group/group-class';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { IconAddComponent } from 'src/app/presentation/icons/icon-add.component';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { IconCollapseAllGreyComponent } from 'src/app/presentation/icons/icon-collapse-all-grey.component';
import { IconExpandAllGreyComponent } from 'src/app/presentation/icons/icon-expand-all-grey.component';
import { IconEyeGreyComponent } from 'src/app/presentation/icons/icon-eye.component';
import { IconGridComponent } from 'src/app/presentation/icons/icon-grid.component';
import { IconRefreshGreyComponent } from 'src/app/presentation/icons/icon-refresh-grey.component';
import { PencilIconGreyComponent } from 'src/app/presentation/icons/pencil-icon-grey.component';
import { IconCopyGreyComponent } from 'src/app/presentation/icons/icon-copy-grey.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDropListGroup, CdkDragMove } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-tree-group',
  templateUrl: './tree-group.component.html',
  styleUrls: ['./tree-group.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    NgbTooltipModule,
    IconAngleDownComponent,
    IconAngleRightComponent,
    TrashIconRedComponent,
    PencilIconGreyComponent,
    IconCopyGreyComponent,
    IconAddComponent,
    IconGridComponent,
    IconEyeGreyComponent,
    IconRefreshGreyComponent,
    IconCollapseAllGreyComponent,
    IconExpandAllGreyComponent,
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeGroupComponent implements OnInit, AfterViewInit, OnDestroy {
  public authorizationService = inject(AuthorizationService);
  public dataManagementGroupService = inject(DataManagementGroupService);
  private navigationService = inject(NavigationService);
  private injector = inject(Injector);
  private modalService = inject(ModalService);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  @Output() switchToGrid = new EventEmitter<void>();

  public hierarchicalTree: Group[] = [];
  public isDragging = false;
  public hoveredNodeId: string | null = null;
  public draggedNodeId: string | null = null;

  private destroy$ = new Subject<void>();
  private effectRef: EffectRef | null = null;
  private expandTimeout: any = null;
  private scrollInterval: any = null;
  private readonly SCROLL_ZONE_SIZE = 100;
  private readonly SCROLL_SPEED = 10;

  ngOnInit(): void {
    this.dataManagementGroupService.init();
    this.dataManagementGroupService.initTree();
    this.readSignals();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.hierarchicalTree) {
        this.debugTreeStructure(this.hierarchicalTree);
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAutoScroll();
    this.clearExpandTimer();

    if (this.effectRef) {
      this.effectRef.destroy();
      this.effectRef = null;
    }
  }

  onClickToggle() {
    this.switchToGrid.emit();
  }

  onClickRefresh() {
    if (this.dataManagementGroupService.groupTree) {
      this.dataManagementGroupService.refreshTree();
    }
  }

  onClickExpand() {
    this.expandAllNodes();
  }

  onClickCollapse() {
    this.collapseAllNodes();
  }

  buildHierarchicalTree(): void {
    if (this.dataManagementGroupService.groupTree) {
      this.hierarchicalTree = this.dataManagementGroupService.groupTree.nodes;
      this.debugTreeStructure(this.hierarchicalTree);
      this.cdr.markForCheck();
    }
  }

  private debugTreeStructure(nodes: any[], level = 0): void {
    if (!nodes || !Array.isArray(nodes)) {
      return;
    }

    nodes.forEach((node) => {
      if (
        node.children &&
        Array.isArray(node.children) &&
        node.children.length > 0
      ) {
        this.debugTreeStructure(node.children, level + 1);
      }
    });
  }

  hasChildren(node: any): boolean {
    return (
      node &&
      node.children &&
      Array.isArray(node.children) &&
      node.children.length > 0
    );
  }

  isNodeSelected(node: Group): boolean {
    return this.dataManagementGroupService.selectedNode()?.id === node.id;
  }

  isNodeExpanded(node: Group): boolean {
    return this.dataManagementGroupService.expandedNodes().has(node.id!);
  }

  selectNode(node: Group): void {
    this.dataManagementGroupService.selectNode(node);
  }

  toggleNode(node: Group): void {
    this.dataManagementGroupService.toggleNodeExpansion(node);
  }

  editNode(node: IGroup): void {
    this.dataManagementGroupService.prepareGroup(node);
    this.navigationService.navigateToEditGroup(node.id);
  }

  copyNode(node: IGroup): void {
    const copiedNode = cloneObject<IGroup>(node);
    copiedNode.id = '';
    copiedNode.name = `${copiedNode.name}-copy`;

    if (copiedNode.groupItems) {
      copiedNode.groupItems.forEach(item => {
        item.id = undefined;
        item.groupId = undefined;
      });
    }

    this.dataManagementGroupService.prepareGroup(copiedNode);
    this.navigationService.navigateToEditGroup();
  }

  addChildNode(parentNode: Group): void {
    this.dataManagementGroupService.createGroup(parentNode.id);
    this.navigationService.navigateToEditGroup();
  }

  onAddRootGroup(): void {
    this.dataManagementGroupService.createGroup();
    this.navigationService.navigateToEditGroup();
  }

  deleteNode(node: Group): void {
    this.modalService.Filing = '';
    this.modalService.componentContext = 'tree-group';

    this.modalService.deleteMessageTitle = this.translate.instant(
      'group.tree.delete-confirmation.title'
    );
    this.modalService.deleteMessage = this.translate.instant(
      'group.tree.delete-confirmation.message'
    );
    this.modalService.deleteMessageOkButton = this.translate.instant(
      'group.tree.delete-confirmation.confirm'
    );
    this.modalService.Filing = node.id!;

    this.modalService.openModel(ModalType.Delete);

    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((type) => {
        if (
          type === ModalType.Delete &&
          this.modalService.componentContext === 'tree-group'
        ) {
          this.dataManagementGroupService.deleteGroup(node.id!)
            .pipe(takeUntil(this.destroy$))
            .subscribe();
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
      });
  }

  expandAllNodes(): void {
    if (this.hierarchicalTree && this.hierarchicalTree.length > 0) {
      const allIds = new Set(this.dataManagementGroupService.expandedNodes());
      const collectIds = (nodes: Group[]) => {
        for (const node of nodes) {
          if (node.id) {
            allIds.add(node.id);
          }
          if (node.children && node.children.length > 0) {
            collectIds(node.children);
          }
        }
      };
      collectIds(this.hierarchicalTree);
      this.dataManagementGroupService.expandedNodes.set(allIds);
    }
  }

  getTotalClientsCount(node: Group): number {
    let total = node.clientsCount || 0;

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        total += this.getTotalClientsCount(child);
      }
    }

    return total;
  }

  private collapseAllNodes(): void {
    if (this.hierarchicalTree && this.hierarchicalTree.length > 0) {
      this.dataManagementGroupService.collapseAllNodes();
    }
  }

  onDragStarted(node: Group): void {
    this.isDragging = true;
    this.draggedNodeId = node.id || null;
  }

  onDragEnded(): void {
    this.isDragging = false;
    this.draggedNodeId = null;
    this.hoveredNodeId = null;
    this.clearExpandTimer();
    this.stopAutoScroll();
  }

  onDragMoved(event: CdkDragMove): void {
    const pointerY = event.pointerPosition.y;
    const appMain = document.querySelector('app-main');

    if (!appMain) return;

    const rect = appMain.getBoundingClientRect();
    const distanceFromTop = pointerY - rect.top;
    const distanceFromBottom = rect.bottom - pointerY;

    if (distanceFromTop < this.SCROLL_ZONE_SIZE && distanceFromTop > 0) {
      this.startAutoScroll(appMain, -this.SCROLL_SPEED);
    } else if (distanceFromBottom < this.SCROLL_ZONE_SIZE && distanceFromBottom > 0) {
      this.startAutoScroll(appMain, this.SCROLL_SPEED);
    } else {
      this.stopAutoScroll();
    }
  }

  private startAutoScroll(element: Element, scrollSpeed: number): void {
    if (this.scrollInterval) return;

    this.scrollInterval = setInterval(() => {
      element.scrollTop += scrollSpeed;
    }, 16);
  }

  private stopAutoScroll(): void {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
  }

  onDropZoneEnter(node: Group): void {
    if (this.isDragging && node.id !== this.draggedNodeId) {
      this.hoveredNodeId = node.id || null;
      this.startExpandTimer(node);
    }
  }

  onDropZoneExit(): void {
    this.hoveredNodeId = null;
    this.clearExpandTimer();
  }

  shouldShowDropZone(node: Group): boolean {
    return this.isDragging &&
           this.hoveredNodeId === node.id &&
           node.id !== this.draggedNodeId;
  }

  private startExpandTimer(node: Group): void {
    this.clearExpandTimer();

    if (this.hasChildren(node) && !this.isNodeExpanded(node)) {
      this.expandTimeout = setTimeout(() => {
        this.dataManagementGroupService.expandNode(node);
        this.cdr.markForCheck();
      }, 800);
    }
  }

  private clearExpandTimer(): void {
    if (this.expandTimeout) {
      clearTimeout(this.expandTimeout);
      this.expandTimeout = null;
    }
  }

  onDrop(event: CdkDragDrop<Group>): void {
    if (event.previousContainer === event.container) {
      this.dataManagementGroupService.initTree(undefined, true);
      this.resetDragState();
      return;
    }

    const draggedNode = event.item.data as Group;
    const targetNode = event.container.data;

    if (!draggedNode || !targetNode) {
      this.dataManagementGroupService.initTree(undefined, true);
      this.resetDragState();
      return;
    }

    if (draggedNode.id === targetNode.id) {
      this.dataManagementGroupService.initTree(undefined, true);
      this.resetDragState();
      return;
    }

    if (this.isDescendant(draggedNode, targetNode)) {
      this.dataManagementGroupService.initTree(undefined, true);
      this.resetDragState();
      return;
    }

    if (draggedNode.id && targetNode.id) {
      this.dataManagementGroupService.moveGroup(draggedNode.id, targetNode.id);
    }

    this.resetDragState();
  }

  private resetDragState(): void {
    this.isDragging = false;
    this.draggedNodeId = null;
    this.hoveredNodeId = null;
    this.clearExpandTimer();
  }

  private isDescendant(parent: Group, potentialDescendant: Group): boolean {
    if (parent.lft < potentialDescendant.lft && parent.rgt > potentialDescendant.rgt) {
      return true;
    }
    return false;
  }

  private readSignals(): void {
    try {
      this.effectRef = runInInjectionContext(this.injector, () => {
        return effect(() => {
          if (this.dataManagementGroupService.isRead()) {
            this.buildHierarchicalTree();
          }
        });
      });
    } catch (error) {
      console.error('Error setting up effect:', error);
    }
  }
}
