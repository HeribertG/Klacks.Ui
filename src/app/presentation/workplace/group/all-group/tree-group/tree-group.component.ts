/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
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
} from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Group, IGroup } from 'src/app/domain/models/group-class';
import { DataManagementGroupService } from 'src/app/domain/services/data-management-group.service';
import { IconAddComponent } from 'src/app/presentation/icons/icon-add.component';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { IconCollapseAllGreyComponent } from 'src/app/presentation/icons/icon-collapse-all-grey.component';
import { IconExpandAllGreyComponent } from 'src/app/presentation/icons/icon-expand-all-grey.component';
import { IconEyeGreyComponent } from 'src/app/presentation/icons/icon-eye.component';
import { IconGridComponent } from 'src/app/presentation/icons/icon-grid.component';
import { IconRefreshGreyComponent } from 'src/app/presentation/icons/icon-refresh-grey.component';
import { PencilIconGreyComponent } from 'src/app/presentation/icons/pencil-icon-grey.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDropListGroup, CdkDragEnter, CdkDragExit } from '@angular/cdk/drag-drop';

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
})
export class TreeGroupComponent implements OnInit, AfterViewInit, OnDestroy {
  public authorizationService = inject(AuthorizationService);
  public dataManagementGroupService = inject(DataManagementGroupService);
  private navigationService = inject(NavigationService);
  private injector = inject(Injector);
  private modalService = inject(ModalService);
  public translate = inject(TranslateService);

  @Output() switchToGrid = new EventEmitter<void>();

  public hierarchicalTree: Group[] = [];
  public isDragging = false;
  public hoveredNodeId: string | null = null;
  public draggedNodeId: string | null = null;

  private effectRef: EffectRef | null = null;

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
      setTimeout(() => {
        this.hierarchicalTree = this.dataManagementGroupService.groupTree.nodes;
        this.debugTreeStructure(this.hierarchicalTree);
      }, 0);
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
    return this.dataManagementGroupService.selectedNode?.id === node.id;
  }

  isNodeExpanded(node: Group): boolean {
    return this.dataManagementGroupService.expandedNodes.has(node.id!);
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

  addChildNode(parentNode: Group): void {
    this.dataManagementGroupService.createGroup(parentNode.id);
  }

  onAddRootGroup(): void {
    this.dataManagementGroupService.createGroup();
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

    const subscription = this.modalService.resultEvent.subscribe((type) => {
      if (
        type === ModalType.Delete &&
        this.modalService.componentContext === 'tree-group'
      ) {
        this.dataManagementGroupService.deleteGroup(node.id!).subscribe();
        this.modalService.componentContext = '';
        this.modalService.Filing = '';
      }
      subscription.unsubscribe();
    });
  }

  expandAllNodes(): void {
    if (this.hierarchicalTree && this.hierarchicalTree.length > 0) {
      const expandNodes = (nodes: Group[]) => {
        for (const node of nodes) {
          if (node.id) {
            this.dataManagementGroupService.expandNode(node);
          }

          if (node.children && node.children.length > 0) {
            expandNodes(node.children);
          }
        }
      };

      expandNodes(this.hierarchicalTree);
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
    console.log('[onDragStarted] Node:', node.id, node.name);
    this.isDragging = true;
    this.draggedNodeId = node.id || null;
    console.log('[onDragStarted] isDragging:', this.isDragging, 'draggedNodeId:', this.draggedNodeId);
  }

  onDragEnded(): void {
    console.log('[onDragEnded] Cleaning up drag state');
    this.isDragging = false;
    this.draggedNodeId = null;
    this.hoveredNodeId = null;
  }

  onDropZoneEnter(node: Group, event: CdkDragEnter<Group>): void {
    console.log('=== [onDropZoneEnter] ===');
    console.log('[onDropZoneEnter] Entered Drop Zone for Node:', node.id, node.name);
    console.log('[onDropZoneEnter] Container ID:', event.container.id);
    console.log('[onDropZoneEnter] isDragging:', this.isDragging, 'draggedNodeId:', this.draggedNodeId);
    console.log('[onDropZoneEnter] Dragged item:', event.item.data);

    if (this.isDragging && node.id !== this.draggedNodeId) {
      this.hoveredNodeId = node.id || null;
      console.log('[onDropZoneEnter] ✓ Set hoveredNodeId to:', this.hoveredNodeId, '(' + node.name + ')');
    } else {
      console.log('[onDropZoneEnter] ✗ Skipped - isDragging:', this.isDragging, 'sameNode:', node.id === this.draggedNodeId);
    }
    console.log('======================');
  }

  onDropZoneExit(): void {
    console.log('[onDropZoneExit] Clearing hoveredNodeId (was:', this.hoveredNodeId, ')');
    this.hoveredNodeId = null;
  }

  shouldShowDropZone(node: Group): boolean {
    const result = this.isDragging &&
           this.hoveredNodeId === node.id &&
           node.id !== this.draggedNodeId;
    if (result) {
      console.log('[shouldShowDropZone] Showing drop zone for node:', node.id, node.name);
    }
    return result;
  }

  onDrop(event: CdkDragDrop<Group>): void {
    console.log('[onDrop] Event triggered!');
    console.log('[onDrop] Event:', event);
    console.log('[onDrop] event.item.data:', event.item.data);
    console.log('[onDrop] event.container.data:', event.container.data);
    console.log('[onDrop] previousContainer:', event.previousContainer.id);
    console.log('[onDrop] container:', event.container.id);

    if (event.previousContainer === event.container) {
      console.warn('[onDrop] Same container - no move needed, refreshing tree');
      this.dataManagementGroupService.initTree(undefined, true);
      this.resetDragState();
      return;
    }

    const draggedNode = event.item.data as Group;
    const targetNode = event.container.data;

    console.log('[onDrop] draggedNode:', draggedNode?.id, draggedNode?.name);
    console.log('[onDrop] targetNode:', targetNode?.id, targetNode?.name);

    if (!draggedNode || !targetNode) {
      console.warn('[onDrop] Missing draggedNode or targetNode - refreshing tree');
      this.dataManagementGroupService.initTree(undefined, true);
      this.resetDragState();
      return;
    }

    if (draggedNode.id === targetNode.id) {
      console.warn('[onDrop] Cannot drop node on itself - refreshing tree');
      this.dataManagementGroupService.initTree(undefined, true);
      this.resetDragState();
      return;
    }

    if (this.isDescendant(draggedNode, targetNode)) {
      console.warn('[onDrop] Cannot move node to its own descendant - refreshing tree');
      this.dataManagementGroupService.initTree(undefined, true);
      this.resetDragState();
      return;
    }

    console.log('[onDrop] Moving node:', draggedNode.id, 'to parent:', targetNode.id);
    if (draggedNode.id && targetNode.id) {
      this.dataManagementGroupService.moveGroup(draggedNode.id, targetNode.id);
    }

    this.resetDragState();
  }

  private resetDragState(): void {
    console.log('[resetDragState] Resetting all drag states');
    this.isDragging = false;
    this.draggedNodeId = null;
    this.hoveredNodeId = null;
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
