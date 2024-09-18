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
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';

@Component({
  selector: 'app-edit-shift-special-feature',
  templateUrl: './edit-shift-special-feature.component.html',
  styleUrls: ['./edit-shift-special-feature.component.scss'],
})
export class EditShiftSpecialFeatureComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('specialFeatureShiftForm', { static: false })
  specialFeatureShiftForm: NgForm | undefined;

  visibleTable = 'inline';

  constructor(public dataManagementShiftService: DataManagementShiftService) {}

  ngOnInit(): void {}
  ngAfterViewInit(): void {}
  ngOnDestroy(): void {}

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  onKeyUpInput(event: any, data: string) {
    event.currentTarget.value = data;
    this.isChangingEvent.emit(true);
  }
}
