/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  EventEmitter,
  inject,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Group, IGroup } from 'src/app/core/group-class';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';
import { SimpleGroupSelectComponent } from 'src/app/shared/simple-group-select/simple-group-select.component';

@Component({
  selector: 'app-edit-shift-group',
  templateUrl: './edit-shift-group.component.html',
  styleUrl: './edit-shift-group.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    FontAwesomeModule,
    IconAngleDownComponent,
    IconAngleRightComponent,
    TrashIconRedComponent,
    SimpleGroupSelectComponent,
  ],
})
export class EditShiftGroupComponent implements AfterViewInit, OnDestroy {
  @ViewChild('groupShiftForm', { static: false }) groupShiftForm:
    | NgForm
    | undefined;

  @Output() isChangingEvent = new EventEmitter<boolean>();

  public dataManagementShiftService = inject(DataManagementShiftService);
  public translate = inject(TranslateService);

  visibleTable = 'inline';
  highlightRowId: string | undefined = undefined;
  selectedGroupId?: string;
  public showGroupInfoBox = false;
  public faInfoCircle = faInfoCircle;

  private objectForUnsubscribe: Subscription | undefined;

  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.groupShiftForm!.valueChanges!.subscribe(
      () => {
        if (this.groupShiftForm!.dirty === true) {
          setTimeout(() => this.validateGroups(), 100);
        }
      }
    );
    this.validateGroups();
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
      const indexToRemove =
        this.dataManagementShiftService.editShift?.groups.findIndex(
          (x) => x.id === group.id
        );
      if (indexToRemove === -1) {
        this.dataManagementShiftService.editShift?.groups.push(group as Group);
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
      const indexToRemove =
        this.dataManagementShiftService.editShift?.groups.findIndex(
          (x) => x.id === group.id
        );
      if (indexToRemove > -1) {
        this.dataManagementShiftService.editShift?.groups.splice(
          indexToRemove,
          1
        );
        this.isChangingEvent.emit(true);
        this.validateGroups();
      }
    }
  }

  private validateGroups() {
    const groups = this.dataManagementShiftService.editShift?.groups;
    this.showGroupInfoBox = !groups || groups.length === 0;
  }
}
