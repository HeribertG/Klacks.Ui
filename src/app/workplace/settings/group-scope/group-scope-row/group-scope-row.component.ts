/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  Input,
  OnInit,
  ViewChild,
  effect,
  OnChanges,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IAuthentication } from 'src/app/core/authentification-class';
import { IGroupVisibility, GroupVisibility } from 'src/app/core/group-class';
import { DataManagementGroupVisibilityService } from 'src/app/data/management/data-management-group-visibility.service';

@Component({
  selector: 'app-group-scope-row',
  imports: [CommonModule, FormsModule, NgbModule, TranslateModule],
  templateUrl: './group-scope-row.component.html',
  styleUrl: './group-scope-row.component.scss',
  standalone: true,
})
export class GroupScopeRowComponent implements OnInit, OnChanges {
  @ViewChild(NgForm, { static: false }) groupForm: NgForm | undefined;
  @Input() user: IAuthentication | undefined;

  public translate = inject(TranslateService);
  private modalService = inject(NgbModal);
  public dataManagementGroupVisibilityService = inject(
    DataManagementGroupVisibilityService
  );
  private cdr = inject(ChangeDetectorRef);

  private userSignal = signal<IAuthentication | undefined>(undefined);

  public selectedGroups: string[] = [];
  public readonly rootList = this.dataManagementGroupVisibilityService.rootList;

  constructor() {
    effect(() => {
      const updated =
        this.dataManagementGroupVisibilityService.groupVisibilitiesUpdated();
      const user = this.userSignal();
      if (updated && user?.id) {
        this.loadUserGroups();
        this.cdr.detectChanges();
      }
    });
  }

  ngOnInit(): void {
    if (this.user) {
      this.userSignal.set(this.user);
    }
    this.loadUserGroups();
  }

  ngOnChanges(): void {
    this.userSignal.set(this.user);
  }

  private loadUserGroups(): void {
    if (!this.user?.id) return;

    this.selectedGroups = this.dataManagementGroupVisibilityService
      .groupVisibilityList()
      .filter((gv) => gv.appUserId === this.user!.id)
      .map((gv) => gv.groupId!)
      .filter((groupId) => groupId !== undefined);
  }

  get assignedGroupsCount(): number {
    if (!this.user?.id) return 0;

    return this.dataManagementGroupVisibilityService
      .groupVisibilityList()
      .filter((gv) => gv.appUserId === this.user!.id).length;
  }

  onCheckboxChange(event: Event, groupId: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedGroups.includes(groupId)) {
        this.selectedGroups = [...this.selectedGroups, groupId];
      }
    } else {
      this.selectedGroups = this.selectedGroups.filter((id) => id !== groupId);
    }
  }

  open(content: any): void {
    if (!this.user?.id) {
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
      (reason) => {
        this.loadUserGroups();
        console.log('Modal dismissed with reason:', reason);
      }
    );
  }

  private saveGroupVisibilities(): void {
    if (!this.user?.id) {
      console.error('User ID is required for saving group visibilities');
      return;
    }

    const currentGroupVisibilities =
      this.dataManagementGroupVisibilityService.groupVisibilityList();

    const filteredVisibilities = currentGroupVisibilities.filter(
      (gv) => gv.appUserId !== this.user!.id
    );

    const newVisibilities: IGroupVisibility[] = this.selectedGroups.map(
      (groupId) => {
        const visibility = new GroupVisibility();
        visibility.groupId = groupId;
        visibility.appUserId = this.user!.id;
        return visibility;
      }
    );

    const updatedVisibilities = [...filteredVisibilities, ...newVisibilities];

    this.dataManagementGroupVisibilityService
      .saveGroupVisibilities(updatedVisibilities)
      .subscribe({
        next: () => {
          console.log('Group visibilities saved successfully');
          this.dataManagementGroupVisibilityService.groupVisibilityList.set(
            updatedVisibilities
          );
          this.loadUserGroups();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error saving group visibilities:', error);
          this.loadUserGroups();
        },
      });
  }
}
