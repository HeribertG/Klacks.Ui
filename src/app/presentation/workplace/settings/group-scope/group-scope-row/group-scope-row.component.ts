import {
  Component,
  inject,
  Input,
  OnDestroy,
  OnChanges,
  signal,
  computed,
} from '@angular/core';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IAuthentication } from 'src/app/domain/models/authentification-class';
import {
  IGroupVisibility,
  GroupVisibility,
} from 'src/app/domain/models/group-class';
import { DataManagementGroupVisibilityService } from 'src/app/domain/services/group/data-management-group-visibility.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-group-scope-row',
  imports: [NgbModule, TranslateModule],
  templateUrl: './group-scope-row.component.html',
  styleUrl: './group-scope-row.component.scss',
  standalone: true,
})
export class GroupScopeRowComponent implements OnChanges, OnDestroy {
  @Input() user: IAuthentication | undefined;

  public translate = inject(TranslateService);
  private modalService = inject(NgbModal);
  public dataManagementGroupVisibilityService = inject(
    DataManagementGroupVisibilityService
  );
  private destroy$ = new Subject<void>();

  private userSignal = signal<IAuthentication | undefined>(undefined);

  public selectedGroups = signal<string[]>([]);
  public readonly rootList = this.dataManagementGroupVisibilityService.rootList;

  public readonly userName = computed(() => {
    const user = this.userSignal();
    if (!user) return '';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  });

  public readonly assignedGroupsCount = computed(() => {
    const user = this.userSignal();
    if (!user?.id) return 0;

    if (user.isAdmin) {
      return this.rootList().length;
    }

    return this.dataManagementGroupVisibilityService
      .groupVisibilityList()
      .filter((gv) => gv.appUserId === user.id).length;
  });

  ngOnChanges(): void {
    this.userSignal.set(this.user);
  }

  private loadUserGroups(): void {
    const user = this.userSignal();
    if (!user?.id) return;

    const groups = this.dataManagementGroupVisibilityService
      .groupVisibilityList()
      .filter((gv) => gv.appUserId === user.id)
      .map((gv) => gv.groupId!)
      .filter((groupId) => groupId !== undefined);

    this.selectedGroups.set(groups);
  }

  isGroupSelected(groupId: string): boolean {
    return this.selectedGroups().includes(groupId);
  }

  onCheckboxChange(event: Event, groupId: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.selectedGroups();

    if (checked) {
      if (!current.includes(groupId)) {
        this.selectedGroups.set([...current, groupId]);
      }
    } else {
      this.selectedGroups.set(current.filter((id) => id !== groupId));
    }
  }

  open(content: unknown): void {
    const user = this.userSignal();
    if (!user?.id) {
      console.error('User ID is required');
      return;
    }

    this.loadUserGroups();

    const modalRef = this.modalService.open(content, {
      size: 'md',
      centered: true,
      animation: false,
    });

    modalRef.result.then(
      (result) => {
        if (result === 'OK') {
          this.saveGroupVisibilities();
        }
      },
      () => {
        this.loadUserGroups();
      }
    );
  }

  private saveGroupVisibilities(): void {
    const user = this.userSignal();
    if (!user?.id) {
      console.error('User ID is required for saving group visibilities');
      return;
    }

    const currentGroupVisibilities =
      this.dataManagementGroupVisibilityService.groupVisibilityList();

    const filteredVisibilities = currentGroupVisibilities.filter(
      (gv) => gv.appUserId !== user.id
    );

    const newVisibilities: IGroupVisibility[] = this.selectedGroups().map(
      (groupId) => {
        const visibility = new GroupVisibility();
        visibility.groupId = groupId;
        visibility.appUserId = user.id;
        return visibility;
      }
    );

    const updatedVisibilities = [...filteredVisibilities, ...newVisibilities];

    this.dataManagementGroupVisibilityService
      .saveGroupVisibilities(updatedVisibilities)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.dataManagementGroupVisibilityService.groupVisibilityList.set(
            updatedVisibilities
          );
          this.loadUserGroups();
        },
        error: (error) => {
          console.error('Error saving group visibilities:', error);
          this.loadUserGroups();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
