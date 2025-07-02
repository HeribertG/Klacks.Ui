/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  Component,
  EffectRef,
  EventEmitter,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output,
  forwardRef,
  inject,
  runInInjectionContext,
  effect,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Group, IGroup } from 'src/app/core/group-class';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';
import { IconAngleUpComponent } from 'src/app/icons/icon-angle-up.component';
import { GroupSelectionService } from '../data/management/group-selection.service';

interface VirtualGroup {
  id: string | null;
  name: string;
  children?: never;
  depth?: number;
  description?: string;
}

type TreeNode = Group | VirtualGroup;

@Component({
  selector: 'app-group-select',
  templateUrl: './group-select.component.html',
  styleUrls: ['./group-select.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    IconAngleDownComponent,
    IconAngleRightComponent,
    IconAngleUpComponent,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GroupSelectComponent),
      multi: true,
    },
  ],
})
export class GroupSelectComponent
  implements OnInit, OnDestroy, ControlValueAccessor
{
  public dataManagementGroupService = inject(DataManagementGroupService);
  private injector = inject(Injector);
  public translate = inject(TranslateService);
  public groupSelectionService = inject(GroupSelectionService);

  @Input() label?: string;
  @Input() required = false;
  @Input() showAllGroupsOption = true;
  @Output() groupSelected = new EventEmitter<Group | null>();

  hierarchicalTree: Group[] = [];
  displayTree: TreeNode[] = [];
  isDropdownOpen = false;
  selectedGroup: Group | null = null;
  selectedGroupId: string | null = null;
  expandedNodes = new Set<string>();
  isDisabled = false;
  private effectRef: EffectRef | null = null;
  private serviceEffectRef: EffectRef | null = null;

  readonly ALL_GROUPS_ID = 'all-groups-virtual';

  private onChange: any = () => {};
  private onTouched: any = () => {};

  ngOnInit(): void {
    this.dataManagementGroupService.init();
    this.dataManagementGroupService.initTree();

    this.setupEffect();
    this.setupServiceEffect();
  }

  ngOnDestroy(): void {
    if (this.effectRef) {
      this.effectRef.destroy();
      this.effectRef = null;
    }
    if (this.serviceEffectRef) {
      this.serviceEffectRef.destroy();
      this.serviceEffectRef = null;
    }
  }

  private setupEffect(): void {
    try {
      this.effectRef = runInInjectionContext(this.injector, () => {
        return effect(() => {
          if (this.dataManagementGroupService.isRead()) {
            this.buildHierarchicalTree();
          }
        });
      });
    } catch (error) {
      console.error('Error when setting up the effect:', error);
    }
  }

  private setupServiceEffect(): void {
    try {
      this.serviceEffectRef = runInInjectionContext(this.injector, () => {
        return effect(() => {
          const serviceSelectedGroup = this.groupSelectionService.selectedGroup;

          if (
            serviceSelectedGroup === undefined ||
            serviceSelectedGroup === null
          ) {
            if (this.selectedGroupId !== this.ALL_GROUPS_ID) {
              this.selectedGroup = null;
              this.selectedGroupId = this.ALL_GROUPS_ID;
              this.onChange(this.selectedGroupId);
              this.onTouched();
            }
          } else if (
            !this.selectedGroup ||
            serviceSelectedGroup.id !== this.selectedGroup.id
          ) {
            this.selectedGroup = serviceSelectedGroup;
            this.selectedGroupId = serviceSelectedGroup.id || null;

            if (this.selectedGroupId) {
              this.onChange(this.selectedGroupId);
              this.onTouched();
            }
          }
        });
      });
    } catch (error) {
      console.error('Error when setting up the service effect:', error);
    }
  }

  buildHierarchicalTree(): void {
    if (this.dataManagementGroupService.groupTree) {
      setTimeout(() => {
        this.hierarchicalTree = this.dataManagementGroupService.groupTree.nodes;

        this.buildDisplayTree();

        if (
          this.selectedGroupId &&
          this.selectedGroupId !== this.ALL_GROUPS_ID
        ) {
          this.findAndSelectGroup(this.selectedGroupId, this.hierarchicalTree);
        } else if (this.showAllGroupsOption) {
          this.selectAllGroups();
        } else if (this.hierarchicalTree.length > 0) {
          this.selectGroupProgrammatically(this.hierarchicalTree[0]);
        }
      }, 0);
    }
  }

  buildDisplayTree(): void {
    this.displayTree = [];

    if (this.showAllGroupsOption) {
      const allGroupsOption: VirtualGroup = {
        id: this.ALL_GROUPS_ID,
        name: this.translate.instant('group.select.all-groups'),
        depth: 0,
      };
      this.displayTree.push(allGroupsOption);
    }

    this.displayTree = [...this.displayTree, ...this.hierarchicalTree];
  }

  selectAllGroups(): void {
    this.selectedGroup = null;
    this.selectedGroupId = this.ALL_GROUPS_ID;
    this.onChange(this.selectedGroupId);
    this.onTouched();
    this.groupSelected.emit(null);

    this.groupSelectionService.clearSelection();

    this.dataManagementGroupService.selectNode(null as any);

    this.closeDropdown();
  }

  selectGroupProgrammatically(group: Group): void {
    this.selectedGroup = group;
    this.selectedGroupId = group.id || null;

    if (this.selectedGroupId) {
      this.onChange(this.selectedGroupId);
      this.onTouched();
      this.groupSelected.emit(group);

      this.groupSelectionService.selectGroup(group);
      this.dataManagementGroupService.selectNode(group);
    }
  }

  toggleDropdown(): void {
    if (!this.isDisabled) {
      this.isDropdownOpen = !this.isDropdownOpen;
    }
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  isVirtualGroup(node: TreeNode): node is VirtualGroup {
    return node.id === this.ALL_GROUPS_ID;
  }

  isRealGroup(node: TreeNode): node is Group {
    return node.id !== this.ALL_GROUPS_ID;
  }

  hasChildren(node: TreeNode): boolean {
    if (this.isVirtualGroup(node)) return false;

    return (
      node &&
      (node as Group).children &&
      Array.isArray((node as Group).children) &&
      (node as Group).children.length > 0
    );
  }

  isNodeExpanded(node: TreeNode): boolean {
    if (this.isVirtualGroup(node)) return false;

    return node.id ? this.expandedNodes.has(node.id) : false;
  }

  toggleNode(node: TreeNode, event: Event): void {
    event.stopPropagation();

    if (this.isVirtualGroup(node)) return;
    if (node.id) {
      if (this.isNodeExpanded(node)) {
        this.expandedNodes.delete(node.id);
      } else {
        this.expandedNodes.add(node.id);
      }
    }
  }

  selectGroup(node: TreeNode, event: Event): void {
    event.stopPropagation();
    if (this.isVirtualGroup(node) && node.id === this.ALL_GROUPS_ID) {
      this.selectAllGroups();
      return;
    }
    if (this.isRealGroup(node)) {
      this.selectedGroup = node as Group;
      this.selectedGroupId = node.id || null;

      if (this.selectedGroupId) {
        this.onChange(this.selectedGroupId);
        this.onTouched();
        this.groupSelected.emit(this.selectedGroup);

        this.groupSelectionService.selectGroup(this.selectedGroup);
        this.dataManagementGroupService.selectNode(this.selectedGroup);
      }
    }

    this.closeDropdown();
  }

  writeValue(value: string): void {
    this.selectedGroupId = value;

    if (value === this.ALL_GROUPS_ID) {
      this.selectedGroup = null;
      this.groupSelectionService.clearSelection();
    } else if (value && this.hierarchicalTree.length > 0) {
      this.findAndSelectGroup(value, this.hierarchicalTree);
    } else if (!value) {
      if (this.showAllGroupsOption) {
        this.selectAllGroups();
      } else {
        this.selectedGroup = null;
        this.groupSelectionService.clearSelection();
      }
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  private findAndSelectGroup(id: string, nodes: IGroup[]): void {
    for (const node of nodes) {
      if (node.id === id) {
        const group = node as Group;
        this.selectedGroup = group;

        this.groupSelectionService.selectGroup(group);
        this.dataManagementGroupService.selectNode(group);
        return;
      }
      if (this.hasChildren(node as Group) && node.children) {
        this.findAndSelectGroup(id, node.children);
        if (this.selectedGroup) return;
      }
    }
  }
}
