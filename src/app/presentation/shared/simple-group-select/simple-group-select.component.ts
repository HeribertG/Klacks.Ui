// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
  ChangeDetectorRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Group, IGroup } from 'src/app/domain/models/group/group-class';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { IconAngleUpComponent } from 'src/app/presentation/icons/icon-angle-up.component';

@Component({
  selector: 'app-simple-group-select',
  templateUrl: './simple-group-select.component.html',
  styleUrls: ['./simple-group-select.component.scss'],
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
      useExisting: forwardRef(() => SimpleGroupSelectComponent),
      multi: true,
    },
  ],
})
export class SimpleGroupSelectComponent
  implements OnInit, OnDestroy, ControlValueAccessor
{
  public dataManagementGroupService = inject(DataManagementGroupService);
  public translate = inject(TranslateService);
  public groupSelectionService = inject(GroupSelectionService);
  private dataManagementSwitchboard = inject(WorkplaceStateService);
  private injector = inject(Injector);
  private cdr = inject(ChangeDetectorRef);

  @Input() hasOptionButton = true;
  @Input() label?: string;
  @Input() required = false;
  @Output() groupSelected = new EventEmitter<Group | null>();

  public hierarchicalTree: Group[] = [];
  public displayTree: Group[] = [];
  public isDropdownOpen = false;
  public selectedGroup: Group | null = null;
  public selectedGroupId: string | null = null;
  public expandedNodes = new Set<string>();
  public isDisabled = false;
  public isVisible = true;

  private effects: EffectRef[] = [];

  private onChange: any = () => {};
  private onTouched: any = () => {};

  ngOnInit(): void {
    this.dataManagementGroupService.init();
    this.dataManagementGroupService.initTree();

    this.readSignals();
    this.readSignalsService();
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
          this.dataManagementSwitchboard.isFocusChanged();

          this.handleFocusChange();
          this.dataManagementSwitchboard.isFocusChanged.set(false);
        });
        this.effects.push(effect2);
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
            this.selectedGroup = null;
            this.selectedGroupId = null;
            this.onChange(null);
            this.onTouched();
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
      setTimeout(() => {
        this.hierarchicalTree = this.dataManagementGroupService.groupTree.nodes;
        this.buildDisplayTree();

        if (this.selectedGroupId) {
          this.findAndSelectGroup(this.selectedGroupId, this.hierarchicalTree);
        } else if (this.hierarchicalTree.length > 0) {
          // Optionally select first group or leave empty
          // this.selectGroupProgrammatically(this.hierarchicalTree[0]);
        }
      }, 0);
    }
  }

  buildDisplayTree(): void {
    // Simply use the hierarchical tree without virtual groups
    this.displayTree = [...this.hierarchicalTree];
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

  hasChildren(node: Group): boolean {
    return (
      node &&
      node.children &&
      Array.isArray(node.children) &&
      node.children.length > 0
    );
  }

  isNodeExpanded(node: Group): boolean {
    return node.id ? this.expandedNodes.has(node.id) : false;
  }

  toggleNode(node: Group, event: Event): void {
    event.stopPropagation();

    if (node.id) {
      if (this.isNodeExpanded(node)) {
        this.expandedNodes.delete(node.id);
      } else {
        this.expandedNodes.add(node.id);
      }
    }
  }

  selectGroup(node: Group, event: Event): void {
    event.stopPropagation();

    this.selectedGroup = node;
    this.selectedGroupId = node.id || null;

    if (this.selectedGroupId) {
      this.onChange(this.selectedGroupId);
      this.onTouched();
      this.groupSelected.emit(this.selectedGroup);

      this.groupSelectionService.selectGroup(this.selectedGroup);
      this.dataManagementGroupService.selectNode(this.selectedGroup);
    }

    this.closeDropdown();
  }

  writeValue(value: string): void {
    this.selectedGroupId = value;

    if (value && this.hierarchicalTree.length > 0) {
      this.findAndSelectGroup(value, this.hierarchicalTree);
    } else if (!value) {
      this.selectedGroup = null;
      this.groupSelectionService.clearSelection();
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

  private isComponentVisible(): boolean {
    // Adjust visibility logic as needed for your use case
    return true;
  }

  private handleFocusChange() {
    this.isVisible = this.isComponentVisible();
    this.cdr.detectChanges();
  }
}
