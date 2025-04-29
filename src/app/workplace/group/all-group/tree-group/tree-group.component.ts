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
      console.log('Tree structure after view init:');
      if (this.hierarchicalTree) {
        this.debugTreeStructure(this.hierarchicalTree);
      } else {
        console.warn('hierarchicalTree is still null or undefined');
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
   * Baut den hierarchischen Baum aus der flachen Liste
   */
  buildHierarchicalTree(): void {
    console.log('buildHierarchicalTree called');
    if (this.dataManagementGroupService.groupTree) {
      setTimeout(() => {
        this.hierarchicalTree =
          this.dataManagementGroupService.groupTree.buildHierarchy();
        this.debugTreeStructure(this.hierarchicalTree);
      }, 0);
    }
  }

  private debugTreeStructure(nodes: any[], level: number = 0): void {
    if (!nodes || !Array.isArray(nodes)) {
      console.warn('Nodes is not an array:', nodes);
      return;
    }

    nodes.forEach((node) => {
      console.log(
        `${'-'.repeat(level * 2)}> Node: ${node.name}, ID: ${node.id}, ` +
          `Parent: ${node.parent}, Children: ${node.children?.length || 0}`
      );

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
    // Modal-Eigenschaften setzen
    this.modalService.deleteMessageTitle =
      'group.tree.delete-confirmation.title';
    this.modalService.deleteMessage = 'group.tree.delete-confirmation.message';
    this.modalService.deleteMessageOkButton =
      'group.tree.delete-confirmation.confirm';
    this.modalService.Filing = node.id!; // ID speichern

    // Modal öffnen
    this.modalService.openModel(ModalType.Delete);

    // Event-Listener für das Ergebnis
    const subscription = this.modalService.resultEvent.subscribe((type) => {
      if (type === ModalType.Delete) {
        this.dataManagementGroupService.deleteGroup(node.id!);
      }
      subscription.unsubscribe();
    });
  }

  private readSignals(): void {
    console.log('Setting up effect...');

    try {
      this.effectRef = runInInjectionContext(this.injector, () => {
        return effect(() => {
          console.log(
            'Effect triggered, isRead():',
            this.dataManagementGroupService.isRead()
          );
          if (this.dataManagementGroupService.isRead()) {
            console.log('Building hierarchical tree...');
            this.buildHierarchicalTree();
          }
        });
      });
      console.log('Effect setup successful');
    } catch (error) {
      console.error('Error setting up effect:', error);
    }
  }
}
