// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  EffectRef,
  EventEmitter,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  Output,
  runInInjectionContext,
  ViewChild,
  input
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Group, IGroup } from 'src/app/domain/models/group/group-class';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { GroupSelectComponent } from 'src/app/presentation/shared/group-select/group-select.component';
import { ShiftStatus } from 'src/app/domain/models/shift/shift-class';
import { AuthService } from 'src/app/presentation/auth/auth.service';

@Component({
  selector: 'app-edit-shift-group',
  templateUrl: './edit-shift-group.component.html',
  styleUrl: './edit-shift-group.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    FontAwesomeModule,
    IconAngleDownComponent,
    IconAngleRightComponent,
    TrashIconRedComponent,
    GroupSelectComponent,
  ],
})
export class EditShiftGroupComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  readonly isReadOnly = input(false);
  @ViewChild('groupShiftForm', { static: false }) groupShiftForm:
    | NgForm
    | undefined;

  @Output() isChangingEvent = new EventEmitter<boolean>();

  public dataManagementShiftService = inject(DataManagementShiftService);
  private authService = inject(AuthService);
  private injector = inject(Injector);
  private cdr = inject(ChangeDetectorRef);

  visibleTable = 'inline';
  highlightRowId: string | undefined = undefined;
  selectedGroupId?: string;
  public showGroupInfoBox = false;
  public faInfoCircle = faInfoCircle;

  private objectForUnsubscribe: Subscription | undefined;
  private effects: EffectRef[] = [];

  ngOnInit(): void {
    this.readSignals();
  }
  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.groupShiftForm!.valueChanges!.subscribe(
      () => {
        if (this.groupShiftForm!.dirty === true) {
          setTimeout(() => {
            this.validateGroups();
            this.cdr.markForCheck();
          }, 100);
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
  }

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  onGroupSelected(group: IGroup | null): void {
    if (this.dataManagementShiftService.editShift && group) {
      const exists = this.dataManagementShiftService.editShift.groups.some(
        (x) => x.id === group.id
      );
      if (!exists) {
        this.dataManagementShiftService.editShift.groups = [
          ...this.dataManagementShiftService.editShift.groups,
          group as Group,
        ];
      }
    }
    this.selectedGroupId = '';
    this.isChangingEvent.emit(true);
    this.validateGroups();
  }

  onLostFocus() {
    this.highlightRowId = undefined;
  }

  onClickedRow(value: Group) {
    this.highlightRowId = value.id;
  }

  onDelete(group: Group) {
    if (this.dataManagementShiftService.editShift && group) {
      this.dataManagementShiftService.editShift.groups =
        this.dataManagementShiftService.editShift.groups.filter(
          (x) => x.id !== group.id
        );
      this.isChangingEvent.emit(true);
      this.validateGroups();
      this.cdr.markForCheck();
    }
  }

  private validateGroups() {
    const groups = this.dataManagementShiftService.editShift?.groups;
    this.showGroupInfoBox = !groups || groups.length === 0;
  }

  private readSignals(): void {
    try {
      runInInjectionContext(this.injector, () => {
        const effect1 = effect(() => {
          this.dataManagementShiftService.isRead();
          this.validateGroups();
          this.cdr.markForCheck();
        });
        this.effects.push(effect1);
      });
    } catch (error) {
      console.error('Error when setting up the effect:', error);
    }
  }

  get isFieldsDisabled(): boolean {
    if (this.isReadOnly()) return true;
    const status = this.dataManagementShiftService.editShift?.status;
    const isNotOriginal =
      status !== undefined && status !== ShiftStatus.OriginalOrder;
    const isNotAuthorisedOrAdmin = !this.authService.isAuthorisedOrAdmin();

    return isNotOriginal && isNotAuthorisedOrAdmin;
  }
}
