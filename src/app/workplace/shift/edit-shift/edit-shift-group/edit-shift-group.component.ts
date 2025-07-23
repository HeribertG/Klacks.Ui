/* eslint-disable @typescript-eslint/no-unused-vars */
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
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
import { ShiftStatus } from 'src/app/core/shift-class';

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
export class EditShiftGroupComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('groupShiftForm', { static: false }) groupShiftForm:
    | NgForm
    | undefined;

  @Output() isChangingEvent = new EventEmitter<boolean>();

  public dataManagementShiftService = inject(DataManagementShiftService);
  public translate = inject(TranslateService);
  private injector = inject(Injector);

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
          setTimeout(() => this.validateGroups(), 100);
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

  private readSignals(): void {
    try {
      runInInjectionContext(this.injector, () => {
        const effect1 = effect(() => {
          this.dataManagementShiftService.isRead();
          this.validateGroups();
        });
        this.effects.push(effect1);
      });
    } catch (error) {
      console.error('Error when setting up the effect:', error);
    }
  }

  // Getter for groups - should remain enabled when IsCut
  get isGroupFieldsDisabled(): boolean {
    return false; // Groups should always remain enabled
  }
}
