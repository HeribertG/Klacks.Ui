// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Reusable group selection component with tree structure and dropdown.
 * @param showAllGroupsOption - Shows an "All Groups" option in the dropdown
 * @param useGlobalSelection - Synchronizes the selection with the global GroupSelectionService
 * @param hasOptionButton - Shows the radio button circle next to each entry
 * @param label - Optional label above the select
 * @param required - Marks the field as required
 * @param index - Index for unique IDs when used multiple times
 * @param disabled - Disables the component
 */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  Component,
  EffectRef,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  forwardRef,
  inject,
  runInInjectionContext,
  effect,
  untracked,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  input,
  output
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Group, IGroup } from 'src/app/domain/models/group/group-class';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { ClickOutsideDirective } from 'src/app/presentation/directives/click-outside.directive';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { IconAngleUpComponent } from 'src/app/presentation/icons/icon-angle-up.component';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { SessionStorageService } from 'src/app/infrastructure/storage/session-storage.service';

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
    ClickOutsideDirective,
    IconAngleDownComponent,
    IconAngleRightComponent,
    IconAngleUpComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  // @Input() properties
  @Input() label?: string;
  readonly required = input(false);
  readonly showAllGroupsOption = input(true);
  readonly hasOptionButton = input(true);
  readonly index = input<number>();
  @Input() set disabled(value: boolean) {
    this.setDisabledState(value);
  }

  /**
   * Controls whether this component operates in global or local mode:
   *
   * - Global mode (true): Used in the header for filtering across pages (ABSENCE/SCHEDULE).
   *   Selection is synchronized with GroupSelectionService and visibility is entity-dependent.
   *
   * - Local mode (false): Used in tables for local data selection (e.g., Client-Groups).
   *   Selection is independent, always visible, and doesn't sync with global state.
   */
  readonly useGlobalSelection = input(true);

  // @Output() properties
  readonly groupSelected = output<Group | null>();

  // Public injected services
  public dataManagementGroupService = inject(DataManagementGroupService);
  public groupSelectionService = inject(GroupSelectionService);
  public translate = inject(TranslateService);

  // Private injected services
  private cdr = inject(ChangeDetectorRef);
  private dataManagementSwitchboard = inject(WorkplaceStateService);
  private dataManagementShiftService = inject(DataManagementShiftService);
  private injector = inject(Injector);
  private sessionStorageService = inject(SessionStorageService);

  // Public properties (used in templates)
  public displayTree: TreeNode[] = [];
  public expandedNodes = new Set<string>();
  public hierarchicalTree: Group[] = [];
  public isDisabled = false;
  public isDropdownOpen = false;
  public isVisible = false;
  public selectedGroup: Group | null = null;
  public selectedGroupId: string | null = null;

  // Private properties
  private effects: EffectRef[] = [];
  private onChange: any = () => {};
  private onTouched: any = () => {};

  // Constants
  readonly ALL_GROUPS_ID = 'all-groups-virtual';
  private readonly SELECTED_GROUP_STORAGE_KEY = 'group-select.selected-group-id';

  get idSuffix(): string {
    const index = this.index();
    return index !== undefined ? `-${index}` : '';
  }

  ngOnInit(): void {
    this.dataManagementGroupService.init();
    this.dataManagementGroupService.initTree();

    this.isVisible = this.isComponentVisible();

    this.readSignals();
    if (this.useGlobalSelection()) {
      this.readSignalsService();
    }
  }

  ngOnDestroy(): void {
    this.effects.forEach((effectRef) => {
      if (effectRef) {
        effectRef.destroy();
      }
    });
    this.effects = [];
  }

  private readSignals(): void {
    try {
      runInInjectionContext(this.injector, () => {
        const effect1 = effect(() => {
          if (this.dataManagementGroupService.isRead()) {
            this.buildHierarchicalTree();
          }
        });
        this.effects.push(effect1);

        const effect2 = effect(() => {
          const focusChanged = this.dataManagementSwitchboard.isFocusChanged();

          if (focusChanged) {
            this.handleFocusChange();
            untracked(() => this.dataManagementSwitchboard.isFocusChanged.set(false));
          }
        });
        this.effects.push(effect2);

        // Visibility must react to the entity shown in the workplace and to async group
        // loading. Not every navigation path sets isFocusChanged, so relying on effect2
        // alone leaves isVisible stuck on its ngOnInit value (header renders before the
        // first entity is set).
        const visibilityEffect = effect(() => {
          this.dataManagementSwitchboard.nameOfVisibleEntity();
          this.dataManagementGroupService.hasRootGroups();
          untracked(() => this.handleFocusChange());
        });
        this.effects.push(visibilityEffect);
      });
    } catch (error) {
      console.error('Error when setting up the effect:', error);
    }
  }

  private readSignalsService(): void {
    try {
      runInInjectionContext(this.injector, () => {
        const effect3 = effect(() => {
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
        this.effects.push(effect3);
      });
    } catch (error) {
      console.error('Error when setting up the service effect:', error);
    }
  }

  buildHierarchicalTree(): void {
    if (this.dataManagementGroupService.groupTree) {
      setTimeout(async () => {
        this.hierarchicalTree = this.dataManagementGroupService.groupTree.nodes;

        this.buildDisplayTree();

        const useGlobalSelection = this.useGlobalSelection();
        if (useGlobalSelection && !this.groupSelectionService.selectedGroup) {
          const storedId = await this.sessionStorageService.restoreFilter<string>(this.SELECTED_GROUP_STORAGE_KEY);
          if (storedId && storedId !== this.ALL_GROUPS_ID) {
            this.selectedGroupId = storedId;
          }
        }

        if (
          this.selectedGroupId &&
          this.selectedGroupId !== this.ALL_GROUPS_ID
        ) {
          this.findAndSelectGroup(this.selectedGroupId, this.hierarchicalTree);
          if (!this.selectedGroup && useGlobalSelection) {
            this.sessionStorageService.removeFilter(this.SELECTED_GROUP_STORAGE_KEY);
            this.selectAllGroups();
          }
        } else if (this.showAllGroupsOption()) {
          this.selectAllGroups();
        } else if (this.hierarchicalTree.length > 0) {
          this.selectGroupProgrammatically(this.hierarchicalTree[0]);
        }
        this.cdr.markForCheck();
      }, 0);
    }
  }

  buildDisplayTree(): void {
    this.displayTree = [];

    if (this.showAllGroupsOption()) {
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

    if (this.useGlobalSelection()) {
      this.groupSelectionService.clearSelection();
      this.dataManagementGroupService.selectNode(null as any);
      this.sessionStorageService.removeFilter(this.SELECTED_GROUP_STORAGE_KEY);
    }

    this.closeDropdown();
  }

  selectGroupProgrammatically(group: Group): void {
    this.selectedGroup = group;
    this.selectedGroupId = group.id || null;

    if (this.selectedGroupId) {
      this.onChange(this.selectedGroupId);
      this.onTouched();
      this.groupSelected.emit(group);

      if (this.useGlobalSelection()) {
        this.groupSelectionService.selectGroup(group);
        this.dataManagementGroupService.selectNode(group);
        this.sessionStorageService.saveFilter(this.SELECTED_GROUP_STORAGE_KEY, this.selectedGroupId);
      }
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

        if (this.useGlobalSelection()) {
          this.groupSelectionService.selectGroup(this.selectedGroup);
          this.dataManagementGroupService.selectNode(this.selectedGroup);
          this.sessionStorageService.saveFilter(this.SELECTED_GROUP_STORAGE_KEY, this.selectedGroupId);
        }
      }
    }

    this.closeDropdown();
  }

  writeValue(value: string): void {
    this.selectedGroupId = value;

    if (value === this.ALL_GROUPS_ID) {
      this.selectedGroup = null;
      if (this.useGlobalSelection()) {
        this.groupSelectionService.clearSelection();
      }
    } else if (value && this.hierarchicalTree.length > 0) {
      this.findAndSelectGroup(value, this.hierarchicalTree);
    } else if (!value) {
      if (this.showAllGroupsOption()) {
        this.selectAllGroups();
      } else {
        this.selectedGroup = null;
        if (this.useGlobalSelection()) {
          this.groupSelectionService.clearSelection();
        }
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

        if (this.useGlobalSelection()) {
          this.groupSelectionService.selectGroup(group);
          this.dataManagementGroupService.selectNode(group);
        }
        return;
      }
      if (this.hasChildren(node as Group) && node.children) {
        this.findAndSelectGroup(id, node.children);
        if (this.selectedGroup) return;
      }
    }
  }

  private isComponentVisible(): boolean {
    if (!this.useGlobalSelection()) {
      return true;
    }

    switch (this.dataManagementSwitchboard.nameOfVisibleEntity()) {
      case EntityName.CLIENT:
        return this.dataManagementGroupService.hasRootGroups();
      case EntityName.ABSENCE:
      case EntityName.SCHEDULE:
      case EntityName.CLIENT_AVAILABILITY:
      case EntityName.MESSAGING:
        return true;
      case EntityName.SHIFT:
        const filter = this.dataManagementShiftService.currentFilter;
        return !(filter.filterType === 0 && filter.isSealedOrder === false);
      case EntityName.DASHBOARD:
        return false;
    }

    return false;
  }

  private handleFocusChange() {
    this.isVisible = this.isComponentVisible();
    this.cdr.detectChanges();
  }
}
