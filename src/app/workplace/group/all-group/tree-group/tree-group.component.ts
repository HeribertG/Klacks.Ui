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
import { TranslateModule } from '@ngx-translate/core';
import { Group, IGroup } from 'src/app/core/group-class';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { IconAddComponent } from 'src/app/icons/icon-add.component';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';
import { IconCollapseAllGreyComponent } from 'src/app/icons/icon-collapse-all-grey.component';
import { IconExpandAllGreyComponent } from 'src/app/icons/icon-expand-all-grey.component';
import { IconEyeGreyComponent } from 'src/app/icons/icon-eye.component';
import { IconGridComponent } from 'src/app/icons/icon-grid.component';
import { IconRefreshGreyComponent } from 'src/app/icons/icon-refresh-grey.component';
import { PencilIconGreyComponent } from 'src/app/icons/pencil-icon-grey.component';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';
import { ModalService, ModalType } from 'src/app/modal/modal.service';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { NavigationService } from 'src/app/services/navigation.service';

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
  ],
})
export class TreeGroupComponent implements OnInit, AfterViewInit, OnDestroy {
  public authorizationService = inject(AuthorizationService);
  public dataManagementGroupService = inject(DataManagementGroupService);
  private navigationService = inject(NavigationService);
  private injector = inject(Injector);
  private modalService = inject(ModalService);

  @Output() switchToGrid = new EventEmitter<void>();

  public hierarchicalTree: Group[] = [];

  private effectRef: EffectRef | null = null;

  ngOnInit(): void {
    this.dataManagementGroupService.init();
    this.dataManagementGroupService.initTree();
    this.readSignals();
  }

  ngAfterViewInit(): void {
    // Add delay to ensure that all data is loaded
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

  private debugTreeStructure(nodes: any[], level: number = 0): void {
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
    this.navigationService.navigateToEditGroup();
  }

  addChildNode(parentNode: Group): void {
    this.dataManagementGroupService.createGroup(parentNode.id);
  }

  onAddRootGroup(): void {
    this.dataManagementGroupService.createGroup();
  }

  deleteNode(node: Group): void {
    this.modalService.deleteMessageTitle =
      'group.tree.delete-confirmation.title';
    this.modalService.deleteMessage = 'group.tree.delete-confirmation.message';
    this.modalService.deleteMessageOkButton =
      'group.tree.delete-confirmation.confirm';
    this.modalService.Filing = node.id!;

    this.modalService.openModel(ModalType.Delete);

    const subscription = this.modalService.resultEvent.subscribe((type) => {
      if (type === ModalType.Delete) {
        this.dataManagementGroupService.deleteGroup(node.id!).subscribe();
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

  private collapseAllNodes(): void {
    if (this.hierarchicalTree && this.hierarchicalTree.length > 0) {
      this.dataManagementGroupService.collapseAllNodes();
    }
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
