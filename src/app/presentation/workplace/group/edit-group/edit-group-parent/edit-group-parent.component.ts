// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Select component for choosing a parent group node in the group hierarchy.
 * @param isChangingEvent - Emitted when the selected parent changes
 */
import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  effect,
  OnDestroy,
  EffectRef,
  inject,
  Injector,
  runInInjectionContext,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { FormField, disabled, form } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { Group } from 'src/app/domain/models/group/group-class';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';

interface EditGroupParentFormModel {
  parent: string;
}

@Component({
  selector: 'app-edit-group-parent',
  templateUrl: './edit-group-parent.component.html',
  styleUrls: ['./edit-group-parent.component.scss'],
  standalone: true,
  imports: [FormField, TranslateModule, ExpandableCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditGroupParentComponent implements OnInit, OnDestroy {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public authorizationService = inject(AuthorizationService);
  public dataManagementGroupService = inject(DataManagementGroupService);
  private translateService = inject(TranslateService);
  private injector = inject(Injector);
  private cdr = inject(ChangeDetectorRef);

  availableParents: Group[] = [];
  groupPath: Group[] = [];
  currentLang: Language = DomainMessages.DEFAULT_LANG;

  private ngUnsubscribe = new Subject<void>();
  private effectRef: EffectRef | null = null;

  public parentFormModel = signal<EditGroupParentFormModel>({ parent: '' });
  public parentSelectForm = form(this.parentFormModel, (f) => {
    disabled(f, { when: () => !this.authorizationService.isAuthorised });
  });

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;

    this.readSignals();

    this.updateAvailableParents();
    this.updateGroupPath();
    this.parentFormModel.set({
      parent: this.dataManagementGroupService.editGroup?.parent ?? '',
    });

    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    if (this.effectRef) {
      this.effectRef.destroy();
      this.effectRef = null;
    }
  }

  updateAvailableParents(): void {
    if (!this.dataManagementGroupService.editGroup) return;

    if (!this.dataManagementGroupService.editGroup.id) {
      this.availableParents = [...this.dataManagementGroupService.flatNodeList];
      return;
    }

    const currentId = this.dataManagementGroupService.editGroup.id;

    const currentNode = this.dataManagementGroupService.flatNodeList.find(
      (n) => n.id === currentId
    );
    if (!currentNode) return;

    const childNodeIds = new Set<string>();
    this.dataManagementGroupService.flatNodeList.forEach((node) => {
      if (
        node.id === currentId ||
        (node.lft > currentNode.lft &&
          node.rgt < currentNode.rgt &&
          node.root === currentNode.root)
      ) {
        childNodeIds.add(node.id!);
      }
    });

    this.availableParents = this.dataManagementGroupService.flatNodeList.filter(
      (node) => !childNodeIds.has(node.id!)
    );
  }

  updateGroupPath(): void {
    if (
      !this.dataManagementGroupService.editGroup ||
      !this.dataManagementGroupService.editGroup.id
    ) {
      this.groupPath = [];
      return;
    }

    const currentId = this.dataManagementGroupService.editGroup.id;
    const currentNode = this.dataManagementGroupService.flatNodeList.find(
      (n) => n.id === currentId
    );
    if (!currentNode) return;

    this.groupPath = this.dataManagementGroupService.flatNodeList
      .filter(
        (node) =>
          node.lft <= currentNode.lft &&
          node.rgt >= currentNode.rgt &&
          node.root === currentNode.root
      )
      .sort((a, b) => a.lft - b.lft);
  }

  getGroupPathDisplay(node: Group): string {
    // Ein einfacher Indikator für die Tiefe
    const indent = '—'.repeat(node.depth);
    return `${indent} ${node.name}`;
  }

  onParentChange(): void {
    if (this.dataManagementGroupService.editGroup) {
      const parentId = this.parentFormModel().parent;
      this.dataManagementGroupService.editGroup.parent = parentId || undefined;
    }
    this.isChangingEvent.emit(true);
  }

  private readSignals(): void {
    this.effectRef = runInInjectionContext(this.injector, () => {
      return effect(() => {
        if (this.dataManagementGroupService.isRead()) {
          this.updateAvailableParents();
          this.updateGroupPath();
          this.parentFormModel.set({
            parent: this.dataManagementGroupService.editGroup?.parent ?? '',
          });
        }
      });
    });
  }
}
