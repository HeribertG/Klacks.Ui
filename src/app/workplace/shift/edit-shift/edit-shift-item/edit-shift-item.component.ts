import {
  AfterViewInit,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-edit-shift-item',
  templateUrl: './edit-shift-item.component.html',
  styleUrls: ['./edit-shift-item.component.scss'],
})
export class EditShiftItemComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Output() isChangingEvent = new EventEmitter<boolean>();
  @Output() isChangingMode = new EventEmitter();

  @ViewChild('mainShiftForm', { static: false }) mainShiftForm:
    | NgForm
    | undefined;

  visibleTable = 'inline';
  isChecked = false;

  objectForUnsubscribe: Subscription | undefined;

  constructor(
    public dataManagementShiftService: DataManagementShiftService,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.setMode();

    this.objectForUnsubscribe = this.mainShiftForm!.valueChanges!.subscribe(
      () => {
        if (this.mainShiftForm!.dirty === true) {
          setTimeout(() => this.isChangingEvent.emit(true), 100);
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

  onComplexModeChecked(): void {
    if (this.isChecked) {
      this.localStorageService.set('mode', 'complex');
    } else {
      this.localStorageService.set('mode', 'simple');
    }

    if (!this.isChecked) {
      if (this.dataManagementShiftService.editShift) {
        this.dataManagementShiftService.editShift.isTimeRange = false;
      }
    }

    this.isChangingMode.emit();
  }

  setMode(): void {
    const currentMode = this.localStorageService.get('mode')
      ? this.localStorageService.get('mode')
      : null;

    this.isChecked = currentMode === 'complex' ? true : false;
  }
}
