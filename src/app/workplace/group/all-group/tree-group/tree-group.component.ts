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
import { TranslateModule } from '@ngx-translate/core';
import { Group, IGroup } from 'src/app/core/group-class';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { IconAddComponent } from 'src/app/icons/icon-add.component';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';
import { IconEyeGreyComponent } from 'src/app/icons/icon-eye.component';
import { IconGridComponent } from 'src/app/icons/icon-grid.component';
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
    IconAngleDownComponent,
    IconAngleRightComponent,
    TrashIconRedComponent,
    PencilIconGreyComponent,
    IconAddComponent,
    IconGridComponent,
    IconEyeGreyComponent,
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
    console.log('TreeGroupComponent initialized');
    this.dataManagementGroupService.init();
    this.dataManagementGroupService.initTree();
    this.readSignals();
  }

  ngAfterViewInit(): void {
    // Verzögerung hinzufügen, um sicherzustellen, dass alle Daten geladen sind
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

  /**
   * Verwendet die vom Backend gelieferte hierarchische Struktur
   */
  buildHierarchicalTree(): void {
    if (this.dataManagementGroupService.groupTree) {
      setTimeout(() => {
        // Da das Backend bereits die hierarchische Struktur liefert,
        // können wir die Nodes direkt verwenden
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
      // Wir brauchen die lft/rgt Werte nicht mehr zu debuggen
      if (
        node.children &&
        Array.isArray(node.children) &&
        node.children.length > 0
      ) {
        this.debugTreeStructure(node.children, level + 1);
      }
    });
  }

  /**
   * Prüft, ob ein Knoten Kinder hat
   */
  hasChildren(node: any): boolean {
    return (
      node &&
      node.children &&
      Array.isArray(node.children) &&
      node.children.length > 0
    );
  }

  /**
   * Prüft, ob ein Knoten ausgewählt ist
   */
  isNodeSelected(node: Group): boolean {
    return this.dataManagementGroupService.selectedNode?.id === node.id;
  }

  /**
   * Prüft, ob ein Knoten expandiert ist
   */
  isNodeExpanded(node: Group): boolean {
    return this.dataManagementGroupService.expandedNodes.has(node.id!);
  }

  /**
   * Wählt einen Knoten aus
   */
  selectNode(node: Group): void {
    this.dataManagementGroupService.selectNode(node);
  }

  /**
   * Schaltet einen Knoten zwischen expandiert und kollabiert um
   */
  toggleNode(node: Group): void {
    this.dataManagementGroupService.toggleNodeExpansion(node);
  }

  /**
   * Öffnet die Bearbeitungsansicht für einen Knoten
   */
  editNode(node: IGroup): void {
    this.dataManagementGroupService.prepareGroup(node);
    this.navigationService.navigateToEditGroup();
  }

  /**
   * Fügt einen neuen Knoten als Kind des ausgewählten Knotens hinzu
   */
  addChildNode(parentNode: Group): void {
    this.dataManagementGroupService.createGroup(parentNode.id);
  }

  /**
   * Fügt einen neuen Wurzelknoten hinzu
   */
  onAddRootGroup(): void {
    this.dataManagementGroupService.createGroup();
  }

  /**
   * Löscht einen Knoten
   */
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
        // Direkt den Service verwenden, der nun selbst den Baum aktualisiert
        this.dataManagementGroupService.deleteGroup(node.id!).subscribe();
      }
      subscription.unsubscribe();
    });
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
