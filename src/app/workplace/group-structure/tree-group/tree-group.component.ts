import { CommonModule } from '@angular/common';
import {
  Component,
  EffectRef,
  OnDestroy,
  OnInit,
  effect,
  inject,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Group, IGroup } from 'src/app/core/group-class';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { IconAddComponent } from 'src/app/icons/icon-add.component';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';
import { PencilIconGreyComponent } from 'src/app/icons/pencil-icon-grey.component';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';
import { ModalService, ModalType } from 'src/app/modal/modal.service';
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
  ],
})
export class TreeGroupComponent implements OnInit, OnDestroy {
  public dataManagementGroupService = inject(DataManagementGroupService);
  private navigationService = inject(NavigationService);
  private modalService = inject(ModalService);

  public hierarchicalTree: Group[] = [];

  private effectRef: EffectRef | null = null;

  ngOnInit(): void {
    this.dataManagementGroupService.init();
    this.dataManagementGroupService.initTree();
    this.readSignals();
  }

  ngOnDestroy(): void {
    if (this.effectRef) {
      this.effectRef.destroy();
      this.effectRef = null;
    }
  }

  /**
   * Baut den hierarchischen Baum aus der flachen Liste
   */
  buildHierarchicalTree(): void {
    if (this.dataManagementGroupService.groupTree) {
      this.hierarchicalTree =
        this.dataManagementGroupService.groupTree.buildHierarchy();
    }
  }

  /**
   * Schaltet die Baumansicht um
   */
  toggleTreeView(): void {
    this.dataManagementGroupService.showTree.update((value) => !value);
  }

  /**
   * Prüft, ob ein Knoten Kinder hat
   */
  hasChildren(node: Group): boolean {
    return !!node.children && node.children.length > 0;
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
    this.effectRef = // Effekt, der auf Änderungen im Baum reagiert
      effect(() => {
        if (this.dataManagementGroupService.isRead()) {
          this.buildHierarchicalTree();
        }
      });
  }
}
