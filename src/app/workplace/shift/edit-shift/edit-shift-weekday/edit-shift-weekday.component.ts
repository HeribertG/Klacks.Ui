import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
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
    selector: 'app-edit-shift-weekday',
    templateUrl: './edit-shift-weekday.component.html',
    styleUrls: ['./edit-shift-weekday.component.scss'],
    standalone: false
})
export class EditShiftWeekdayComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Output() isChangingEvent = new EventEmitter<boolean>();
  @Input() isComplex = false;

  @ViewChild('weekdayShiftForm', { static: false }) weekdayShiftForm:
    | NgForm
    | undefined;

  visibleTable = 'inline';
  disabledWorkTime = true;

  private objectForUnsubscribe: Subscription | undefined;

  constructor(public dataManagementShiftService: DataManagementShiftService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.weekdayShiftForm!.valueChanges!.subscribe(
      () => {
        if (this.weekdayShiftForm!.dirty === true) {
          setTimeout(() => this.isChangingEvent.emit(true), 100);
          setTimeout(() => this.check(), 100);
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

  onKeyUpInput(event: any, data: string) {
    event.currentTarget.value = data;
    this.isChangingEvent.emit(true);
  }

  private check() {
    if (this.dataManagementShiftService.editShift) {
      this.disabledWorkTime = this.dataManagementShiftService.editShift
        .isTimeRange
        ? false
        : true;
    }
  }
}
