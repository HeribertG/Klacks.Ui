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

  @Input() label?: string;
  @Input() required = false;
  @Output() groupSelected = new EventEmitter<Group>();

  hierarchicalTree: Group[] = [];
  isDropdownOpen = false;
  selectedGroup: Group | null = null;
  selectedGroupId: string | null = null;
  expandedNodes = new Set<string>();
  isDisabled = false;
  private effectRef: EffectRef | null = null;

  private onChange: any = () => {};
  private onTouched: any = () => {};

  ngOnInit(): void {
    this.dataManagementGroupService.init();
    this.dataManagementGroupService.initTree();

    this.setupEffect();
  }

  ngOnDestroy(): void {
    if (this.effectRef) {
      this.effectRef.destroy();
      this.effectRef = null;
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
      console.error('Fehler beim Einrichten des Effects:', error);
    }
  }

  buildHierarchicalTree(): void {
    if (this.dataManagementGroupService.groupTree) {
      setTimeout(() => {
        this.hierarchicalTree = this.dataManagementGroupService.groupTree.nodes;

        if (this.selectedGroupId) {
          this.findAndSelectGroup(this.selectedGroupId, this.hierarchicalTree);
        }
      }, 0);
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

  onClickOutside(event: MouseEvent): void {
    this.closeDropdown();
  }

  hasChildren(node: any): boolean {
    return (
      node &&
      node.children &&
      Array.isArray(node.children) &&
      node.children.length > 0
    );
  }

  isNodeExpanded(node: Group): boolean {
    return this.expandedNodes.has(node.id!);
  }

  toggleNode(node: Group, event: Event): void {
    event.stopPropagation();
    if (this.isNodeExpanded(node)) {
      this.expandedNodes.delete(node.id!);
    } else {
      this.expandedNodes.add(node.id!);
    }
  }

  selectGroup(group: Group, event: Event): void {
    event.stopPropagation();
    this.selectedGroup = group;
    this.selectedGroupId = group.id!;
    this.onChange(this.selectedGroupId);
    this.onTouched();
    this.groupSelected.emit(group);
    this.closeDropdown();
  }

  writeValue(value: string): void {
    this.selectedGroupId = value;
    if (value && this.hierarchicalTree.length > 0) {
      this.findAndSelectGroup(value, this.hierarchicalTree);
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
        this.selectedGroup = node as Group;
        return;
      }
      if (this.hasChildren(node) && node.children) {
        this.findAndSelectGroup(id, node.children);
        if (this.selectedGroup) return;
      }
    }
  }
}
