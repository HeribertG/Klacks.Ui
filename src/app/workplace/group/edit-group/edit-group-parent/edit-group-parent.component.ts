import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
  effect,
  OnDestroy,
  EffectRef,
  inject,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { Group } from 'src/app/core/group-class';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { AuthorizationService } from 'src/app/services/authorization.service';

@Component({
  selector: 'app-edit-group-parent',
  templateUrl: './edit-group-parent.component.html',
  styleUrls: ['./edit-group-parent.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
})
export class EditGroupParentComponent implements OnInit, OnDestroy {
  @Output() isChangingEvent = new EventEmitter<boolean>();
  @ViewChild('parentForm') parentForm!: NgForm;

  public authorizationService = inject(AuthorizationService);
  public dataManagementGroupService = inject(DataManagementGroupService);
  private translateService = inject(TranslateService);
  private injector = inject(Injector);

  availableParents: Group[] = [];
  groupPath: Group[] = [];
  currentLang: Language = MessageLibrary.DEFAULT_LANG;

  private ngUnsubscribe = new Subject<void>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formChangeSubscription: any;
  private effectRef: EffectRef | null = null;

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;

    this.readSignals();

    this.updateAvailableParents();
    this.updateGroupPath();

    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
      });

    setTimeout(() => {
      if (this.parentForm && this.parentForm.form) {
        this.formChangeSubscription =
          this.parentForm.form.valueChanges?.subscribe(() => {
            if (this.parentForm.dirty) {
              this.isChangingEvent.emit(true);
            }
          });
      }
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.formChangeSubscription) {
      this.formChangeSubscription.unsubscribe();
    }
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

  /**
   * Handler für Änderungen der Elterngruppe
   */
  onParentChange(): void {
    this.isChangingEvent.emit(true);
  }

  private readSignals(): void {
    this.effectRef = runInInjectionContext(this.injector, () => {
      return effect(() => {
        if (this.dataManagementGroupService.isRead()) {
          this.updateAvailableParents();
          this.updateGroupPath();
        }
      });
    });
  }
}
